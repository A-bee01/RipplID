/**
 * @fileoverview This file contains the JavaScript code for the application logic of the RipplID project.
 * It includes functions for handling user authentication, interacting with the Firebase Firestore database,
 * connecting to the XRPL (XRP Ledger) test server, and performing various operations such as searching and registering domains,
 * making payments with XRP, creating wallets, and retrieving user data.
 *
 * @author [emejulucodes]
 * @version 1.0
 */
import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

const auth = firebase.auth();
/**
 * Firebase Firestore database instance.
 * @type {firebase.firestore.Firestore}
 */
const db = firebase.firestore();
const PUBLIC_SERVER = "wss://xrplcluster.com/";
/**
 * The test server URL for the application.
 * @type {string}
 */
const TEST_SERVER = "wss://s.altnet.rippletest.net:51233";
const XRPLclient = new xrpl.Client(TEST_SERVER);

const balance = document.querySelector("#balance");
const sendfundsform = document.querySelector("#sendfundsform");
const ripplidname = document.querySelector("#ripplidname");
const amount = document.querySelector("#amount");
const sendfundsbtn = document.querySelector("#sendfunds");
const logoutButton = document.querySelector("#logoutbtn");
const fundwalletBtn = document.querySelector("#fundwallet");
/**
 * Button element for creating a wallet.
 * @type {HTMLElement}
 */
const createwalletBtn = document.querySelector("#connectwallet");
const menuToggle = document.querySelector("#menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");

logoutButton.addEventListener("click", handleSignOut);

sendfundsform.addEventListener("submit", (e) => {
  e.preventDefault();
});

// Add event listeners to the buttons that make up the mobile menu. This is called when the user clicks on one of the buttons
menuToggle.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

fundwalletBtn.addEventListener("click", () => {
  fundWalletWithXRP();
});

createwalletBtn.addEventListener("click", () => {
  createWallet();
});

sendfundsbtn.addEventListener("click", () => {
  //chek if domain is valid and ends with .ppl
  /**
   * Regular expression for validating domain names.
   * @type {RegExp}
   */
  const domainRegex = new RegExp(
    /^(?=.{1,254}$)((?=.{1,63}\.)[a-zA-Z0-9_](?:(?:[a-zA-Z0-9_]|-){0,61}[a-zA-Z0-9_])?\.[ppl]{3})$/
  );
  //If domain is invalid
  if (!domainRegex.test(ripplidname.value)) {
    swal.fire({
      title: "Invalid domain",
      text: "Please enter a valid domain name, only .ppl domains are allowed",
      icon: "warning",
    });
    return;
  }
  if (amount.value < 1) {
    swal.fire({
      title: "Invalid amount",
      text: "Please enter a valid amount",
      icon: "warning",
    });
    return;
  }
  //check if domain is available
  searchAndFetchUser(ripplidname.value);
});


async function searchAndFetchUser(domain) {
  Swal.fire({
    title: "Searching...",
    html: `Searching for RipplID Name: <b>${domain}</b>`,
    icon: "info",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    showConfirmButton: false,
    willOpen: () => {
      Swal.showLoading();
    },
  });
  const domainRef = db.collection("domains");
  domainRef
    .where("domain", "==", domain)
    .get()
    .then(async (querySnapshot) => {
      if (querySnapshot.empty) {
        swal
          .fire({
            title: "Domain not found",
            html: `<b>${domain}</b> not found. <br> Please make sure you entered the correct domain name`,
            icon: "info",
            confirmButtonText: "OK",
          })
          .then(async (result) => {
            if (result.isConfirmed) {
              Swal.close();
            }
          });
      } else {
        const userRef = db.collection("users").doc(auth.currentUser.email);
        const doc = await userRef.get();
        const data = doc.data();
        swal
          .fire({
            title: `${domain} found.`,
            html: `Wallet address: <b>${
              querySnapshot.docs[0].data().walletid
            }</b> <br> Send <b>${amount.value} XRP</b> to ${domain} ?`,
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Send",
          })
          .then(async (result) => {
            if (result.isConfirmed) {
              //if user owns the domain
              if (
                querySnapshot.docs[0].data().email === auth.currentUser.email
              ) {
                Swal.fire({
                  title: "Action not allowed",
                  html: `You cannot send funds to yourself. <br> Please enter a valid domain name`,
                  icon: "warning",
                  confirmButtonText: "OK",
                }).then((result) => {
                  if (result.isConfirmed) {
                    Swal.close();
                  }
                });
                return;
              }

              if (data.walletid == null) {
                Swal.fire({
                  title: "No wallet",
                  html: `Please create a wallet first`,
                  icon: "warning",
                  confirmButtonText: "OK",
                }).then((result) => {
                  if (result.isConfirmed) {
                    Swal.close();
                  }
                });
                return;
              }

              if (amount.value > data.balance) {
                Swal.fire({
                  title: "Insufficient funds",
                  html: `You have insufficient funds to make this payment. <br> Please fund your wallet and try again`,
                  icon: "warning",
                  confirmButtonText: "OK",
                }).then((result) => {
                  if (result.isConfirmed) {
                    Swal.close();
                  }
                });
                return;
              }

              Swal.fire({
                title: "Please wait...",
                html: `Processing payment of <b>${amount.value} XRP</b> to <b>${domain}</b>`,
                icon: "info",
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: false,
                showConfirmButton: false,
                willOpen: () => {
                  Swal.showLoading();
                },
              });
              await sendPaymentWithXRP(amount.value, domain);
            }
          });
      }
    });
}

async function sendPaymentWithXRP(amount, domain) {
  const domainRef = db.collection("domains");
  const userRef = db.collection("users").doc(auth.currentUser.email);
  const domainDoc = await domainRef.where("domain", "==", domain).get();
  const receiverRef = db
    .collection("users")
    .doc(domainDoc.docs[0].data().email);
  const receiverDoc = await receiverRef.get();
  const doc = await userRef.get();
  const data = doc.data();
  const walletfromseed = xrpl.Wallet.fromSeed(data.walletseed);

  const preparedTx = await XRPLclient.autofill({
    TransactionType: "Payment",
    Account: data.walletid,
    Amount: "20",
    Destination: receiverDoc.data().walletid,
  });
  const max_ledger = preparedTx.LastLedgerSequence;
  const signed = walletfromseed.sign(preparedTx);
  const tx = await XRPLclient.submitAndWait(signed.tx_blob);
  console.log(tx);

  if (tx.result.meta.TransactionResult ===
     "tesSUCCESS") {
    Swal.fire({ 
      title: "Success!",
      html: `Payment of <b>${amount} XRP</b> to <b>${domain}</b> was successful!`,
      icon: "success",
      confirmButtonText: "OK",
    }).then((result) => {
      if (result.isConfirmed) {
        Wind
      }
    });
  } else {
    Swal.fire({
      title: "Error!",
      html: `Payment of <b>${amount} XRP</b> to <b>${domain}</b> failed! <br> Please try again later`,
      icon: "error",
      confirmButtonText: "OK",
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.reload();
      }
    });
  }
}

/**
 * Connects to XRPL.
 * @async
 * @function connectXRPL
 * @returns {Promise<void>}
 */
async function connectXRPL() {
  await XRPLclient.connect();
}

/**
 * Funds the user's wallet with XRP.
 * @returns {Promise<void>} A promise that resolves when the wallet is funded.
 */
async function fundWalletWithXRP() {
  /* The above code is checking if a user has a wallet ID stored in the database. If the wallet ID is
  null, it displays a warning message using the Swal (SweetAlert) library, prompting the user to
  create a wallet. If the wallet ID is not null, it displays the wallet ID in a formatted title and
  provides instructions to send XRP to the user's address to fund the wallet. */
  const userRef = db.collection("users").doc(auth.currentUser.email);
  const doc = await userRef.get();
  if (doc.data().walletid == null) {
    swal.fire({
      title: "No wallet",
      text: "Please a create wallet first",
      icon: "warning",
    });
  } else {
    swal.fire({
      title: `<b style="font-size: smaller">${doc.data().walletid}</b>`,
      text: "Send XRP to your address to fund your wallet",
      icon: "info",
    });
  }
}

/**
 * Retrieves the balance of the user's account and performs necessary actions based on the balance.
 * @returns {Promise<void>} A promise that resolves when the balance retrieval and actions are completed.
 */
async function getBalance() {
  try {
    const userRef = db.collection("users").doc(auth.currentUser.email);
    const doc = await userRef.get();
    const account = await XRPLclient.request({
      command: "account_info",
      account: doc.data().walletid,
      ledger_index: "validated",
    });
    //compare balance to check if new balance is greater than old balance
    /* The above code is checking if the difference between the account balance
  (account.result.account_data.Balance) and 10,000,000,000 is greater than the balance stored in the
  "doc" object (doc.data().balance). If the condition is true, it displays a success message using the
  swal.fire() function, updates the balance in the userRef object, adds a new transaction to the
  "transactions" collection in the database, and logs the account balance to the console. */
    if (
      account.result.account_data.Balance - 10000000000 >
      doc.data().balance
    ) {
      swal.fire({
        title: "Success!",
        html: `Account Successfully Funded! <br> Amount: <b>${
          account.result.account_data.Balance - 10000000000 - doc.data().balance
        } XRP</b>`,
        icon: "success",
        confirmButtonText: "OK",
      });
      userRef.update({
        balance: account.result.account_data.Balance - 10000000000,
      });
      //ad to transaction history
      db.collection("transactions").add({
        amount: account.result.account_data.Balance - 10000000000,
        date: new Date(),
        type: "Deposit",
        email: auth.currentUser.email,
        trasactionhash: account.result.account_data.Account,
      });
      console.log(account.result.account_data.Balance);
    }
    userRef.update({
      balance: account.result.account_data.Balance - 10000000000,
    });
    balance.textContent = account.result.account_data.Balance - 10000000000;
  } catch (error) {
    console.error(error);
    balance.textContent = "0";
  }
}

/**
 * Creates a wallet for the current user.
 * If the user doesn't have a wallet, it generates a new wallet and saves the wallet details in the database.
 * If the user already has a wallet, it copies the wallet address to the clipboard.
 */
async function createWallet() {
  const userRef = db.collection("users").doc(auth.currentUser.email);
  const doc = await userRef.get();
  if (!doc.data().walletid) {
    createwalletBtn.innerHTML =
      "<img src='/src/images/loader/loader.gif' class='h-6 w-6' />";
    const generate_wallet = await XRPLclient.fundWallet();
    const new_wallet = generate_wallet.wallet;
    console.log(new_wallet);
    const wallet = new_wallet;
    db.collection("users")
      .doc(auth.currentUser.email)
      .update({
        walletid: wallet.address,
        walletseed: wallet.seed,
        walletpk: wallet.publicKey,
        walletsk: wallet.privateKey,
      })
      .then(() => {
        createwalletBtn.textContent = wallet.address;
        if (/Mobile/.test(navigator.userAgent)) {
          if (doc.data().walletid != null) {
            if (createwalletBtn.textContent.length > 10) {
              createwalletBtn.textContent =
                createwalletBtn.textContent.substring(0, 10) + "...";
            }
          }
        }
        swal
          .fire({
            title: "Success!",
            text: "Wallet created successfully!",
            icon: "success",
            confirmButtonText: "OK",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.reload();
            }
          });
      });
  } else {
    //copy to clipboard
    const userRef = db.collection("users").doc(auth.currentUser.email);
    const doc = await userRef.get();
    const el = document.createElement("textarea");
    el.value = doc.data().walletid;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    swal.fire({
      title: "Success!",
      text: "Wallet address copied to clipboard!",
      icon: "success",
      confirmButtonText: "OK",
    });
  }
}

/**
 * Checks if the user is authenticated.
 * @param {Object} user - The user object.
 * @returns {Object} - The user object if authenticated, otherwise redirects to the login page.
 */
function checkAuth(user) {
  if (user) {
    return user;
  } else {
    window.location.href = "/auth/login";
  }
}

onAuthStateChanged(auth, async function (user) {
  if (user) {
    checkAuth(user);
    await connectXRPL();
    await getBalance();
    getUserData(user).then((data) => {
      createwalletBtn.textContent = data.walletid
        ? data.walletid
        : "Create Wallet";
      if (/Mobile/.test(navigator.userAgent)) {
        if (data.walletid != null) {
          if (createwalletBtn.textContent.length > 10) {
            createwalletBtn.textContent =
              createwalletBtn.textContent.substring(0, 10) + "...";
          }
        }
      }
    });
  } else {
    window.location.href = "/auth/login";
  }
});

// get user data from firestore
/**
 * Retrieves user data from the database.
 * @param {Object} user - The user object.
 * @returns {Promise<Object|null>} - The user data or null if user is not provided or document does not exist.
 */
const getUserData = async (user) => {
  /* The above code is checking if a user exists and retrieving their data from a Firestore database. */
  if (!user) {
    return null;
  }

  const userRef = db.collection("users").doc(user.email);
  const doc = await userRef.get();
  if (!doc.exists) {
    console.log("No such document!");
    return null;
  } else {
    const data = doc.data();
    return data;
  }
};

/**
 * Handles the sign out functionality.
 */
function handleSignOut() {
  signOut(auth)
    .then(() => {
      // Sign-out successful.
      XRPLclient.disconnect();
      window.location.href = "/";
    })
    .catch((error) => {
      // An error happened.
      console.log(error);
    });
}

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
const searchdomain = document.querySelector("#searchdomain");
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

searchdomain.addEventListener("submit", (e) => {
  e.preventDefault();
  const domain = searchdomain.querySelector("input").value;
  //chek if domain is valid and ends with .ppl
  /**
   * Regular expression for validating domain names.
   * @type {RegExp}
   */
  const domainRegex = new RegExp(
    /^(?=.{1,254}$)((?=.{1,63}\.)[a-zA-Z0-9_](?:(?:[a-zA-Z0-9_]|-){0,61}[a-zA-Z0-9_])?\.[ppl]{3})$/
  );
  //If domain is invalid
  if (!domainRegex.test(domain)) {
    swal.fire({
      title: "Invalid domain",
      text: "Please enter a valid domain, only .ppl domains are allowed",
      icon: "warning",
    });
    return;
  }
  searchAndFetchDomain(domain);
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

/**
 * Searches for a domain in the "domains" collection and fetches the domain information.
 * If the domain is available, prompts the user to register it.
 * If the domain is already taken, displays the information of the user who registered it.
 * @param {string} domain - The domain to search for.
 * @returns {Promise<void>} - A promise that resolves when the search and fetch operation is complete.
 */
async function searchAndFetchDomain(domain) {
  Swal.fire({
    title: "Searching...",
    html: `Searching for <b>${domain}</b>`,
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
  //check if someone has already registered the domain
  domainRef
    .where("domain", "==", domain)
    .get()
    .then(async (querySnapshot) => {
      if (querySnapshot.empty) {
        /* The above code is displaying a pop-up dialog using the SweetAlert library. The dialog shows the
availability of a domain and the amount required to register it. If the user clicks on the
"Register" button, it checks if the user has a wallet and sufficient balance. If the user doesn't
have a wallet, a warning message is displayed. If the user has insufficient funds, another warning
message is displayed. Otherwise, it calls the function makePaymentWithXRP to make a payment of 10
XRP for the domain. */
        swal
          .fire({
            title: "Domain available",
            html: `<b>${domain}</b> <br> Amount: <b>10 XRP + 2 XRP Fee</b>`,
            icon: "info",
            confirmButtonText: "Register",
          })
          .then(async (result) => {
            if (result.isConfirmed) {
              Swal.fire({
                title: "Please wait...",
                showConfirmButton: false,
                willOpen: () => {
                  Swal.showLoading();
                },
              });
              const userRef = db
                .collection("users")
                .doc(auth.currentUser.email);
              const doc = await userRef.get();
              if (doc.data().walletid == null) {
                swal.fire({
                  title: "No wallet",
                  text: "Please a create wallet first",
                  icon: "warning",
                });
              } else if (doc.data().balance < 10) {
                swal.fire({
                  title: "Insufficient funds",
                  text: "Please fund your wallet",
                  icon: "warning",
                });
              } else {
                await makePaymentWithXRP(10, domain);
              }
            }
          });
      } else {
        const userRef = db.collection("users").doc(auth.currentUser.email);
        const doc = await userRef.get();
        const data = doc.data();
        swal.fire({
          title: "Domain Already Taken",
          html: `<b>${domain}</b> <br> This domain has already been registered by <b>${data.walletid}</b>`,
          icon: "info",
        });
      }
    });
}

/**
 * Makes a payment with XRP.
 * @param {number} amount - The amount of XRP to be paid.
 * @param {string} domain - The domain to be registered.
 * @returns {Promise<void>} - A promise that resolves when the payment is successful.
 */
async function makePaymentWithXRP(amount, domain) {
  const domainRef = db.collection("domains");
  const userRef = db.collection("users").doc(auth.currentUser.email);
  const doc = await userRef.get();
  const walletfromseed = xrpl.Wallet.fromSeed(doc.data().walletseed);
  if (doc.data().walletid == null) {
    swal.fire({
      title: "No wallet",
      text: "Please a create wallet first",
      icon: "warning",
    });
  } else {
    const prepared = await XRPLclient.autofill({
      TransactionType: "Payment",
      Account: doc.data().walletid,
      Amount: xrpl.xrpToDrops(amount * 1000000),
      Destination: "rs2m5CgLXSSSzZvCXiHGH9iDgXvPLuMkgZ",
    });
    const max_ledger = prepared.LastLedgerSequence;
    const signed = walletfromseed.sign(prepared);
    const tx = await XRPLclient.submitAndWait(signed.tx_blob);
    swal
      .fire({
        title: "Success!",
        html: `Payment of <b>${amount + 2} XRP</b> was successful!`,
        icon: "success",
        confirmButtonText: "OK",
      })
      .then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Finalizing...",
            showConfirmButton: false,
            willOpen: () => {
              Swal.showLoading();
            },
          });
          domainRef
            .add({
              domain: domain,
              email: auth.currentUser.email,
              date: new Date(),
              walletid: doc.data().walletid,
            })
            .then(() => {
              //deduct 10 xrp from user balance
              userRef.update({
                balance: doc.data().balance - 10,
                totaldomains: doc.data().totaldomains + 1,
              });
              //add to transaction history
              db.collection("transactions").add({
                amount: 10,
                date: new Date(),
                type: "Domain Registration",
                email: auth.currentUser.email,
                trasactionhash: domain,
              });
              swal
                .fire({
                  title: "Success!",
                  html: `Domain <b>${domain}</b> is now registered to <b>${
                    doc.data().walletid
                  }</b>`,
                  icon: "success",
                  confirmButtonText: "OK",
                })
                .then(() => {
                  window.location.reload();
                });
            });
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

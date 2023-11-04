import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

const auth = firebase.auth();
const db = firebase.firestore();
const PUBLIC_SERVER = "wss://xrplcluster.com/";
const TEST_SERVER = "wss://s.altnet.rippletest.net:51233";
const XRPLclient = new xrpl.Client(TEST_SERVER);
const balance = document.getElementById("balance");
const searchdomain = document.getElementById("searchdomain");
const logoutButton = document.getElementById("logoutbtn");
const fundwalletBtn = document.getElementById("fundwallet");
const createwalletBtn = document.getElementById("connectwallet");
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

logoutButton.addEventListener("click", handleSignOut);

searchdomain.addEventListener("submit", (e) => {
  e.preventDefault();
  const domain = searchdomain.querySelector("input").value;
  //chek if domain is valid and ends with .xrp
  const domainRegex = new RegExp(
    /^(?=.{1,254}$)((?=.{1,63}\.)[a-zA-Z0-9_](?:(?:[a-zA-Z0-9_]|-){0,61}[a-zA-Z0-9_])?\.[xrp]{3})$/
  );
  if (!domainRegex.test(domain)) {
    swal.fire({
      title: "Invalid domain",
      text: "Please enter a valid domain, only .xrp domains are allowed",
      icon: "warning",
    });
    return;
  }
  searchAndFetchDomain(domain);
});

menuToggle.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

fundwalletBtn.addEventListener("click", () => {
  fundWalletWithXRP();
});

createwalletBtn.addEventListener("click", () => {
  createWallet();
});

async function searchAndFetchDomain(domain) {
  const domainRef = db.collection("domains");
  //check if someone has already registered the domain
  domainRef
    .where("domain", "==", domain)
    .get()
    .then(async (querySnapshot) => {
      if (querySnapshot.empty) {
        swal
          .fire({
            title: "Domain available",
            html: `<b>${domain}</b> <br> Amount: <b>10 XRP + 2 XRP Fee</b>`,
            icon: "info",
            confirmButtonText: "Register",
          })
          .then(async (result) => {
            if (result.isConfirmed) {
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
      "TransactionType": "Payment",
      "Account": doc.data().walletid,
      "Amount": xrpl.xrpToDrops(amount * 1000000),
      "Destination": "rs2m5CgLXSSSzZvCXiHGH9iDgXvPLuMkgZ",
    });
    const max_ledger = prepared.LastLedgerSequence
    const signed = walletfromseed.sign(prepared);
    const tx = await XRPLclient.submitAndWait(signed.tx_blob);
    swal.fire({
      title: "Success!",
      html: `Payment of <b>${amount + 2} XRP</b> was successful!`,
      icon: "success",
      confirmButtonText: "OK",
    }).then((result) => {
      if (result.isConfirmed) {
       
      }
    });
    domainRef
    .add({
      domain: domain,
      email: auth.currentUser.email,
      date: new Date(),
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
      swal.fire({
        title: "Success!",
        html: `Domain <b>${domain}</b> is now registered to <b>${
          doc.data().walletid
        }</b>`,
        icon: "success",
        confirmButtonText: "OK",
      });
    });
  }
}

async function connectXRPL() {
  await XRPLclient.connect();
}

async function fundWalletWithXRP() {
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
  }
}

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
const getUserData = async (user) => {
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

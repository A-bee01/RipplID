import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

const auth = firebase.auth();
const db = firebase.firestore();
const PUBLIC_SERVER = "wss://xrplcluster.com/";
const TEST_SERVER = "wss://s.altnet.rippletest.net:51233";
const XRPLclient = new xrpl.Client(TEST_SERVER);
const balance = document.querySelector("#balance");
const logoutButton = document.querySelector("#logoutbtn");
const fundwalletBtn = document.querySelector("#fundwallet");
const createwalletBtn = document.querySelector("#connectwallet");
const transactiontableBody = document.querySelector("#transactiontable-body");
const menuToggle = document.querySelector("#menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");

logoutButton.addEventListener("click", handleSignOut);

menuToggle.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

fundwalletBtn.addEventListener("click", () => {
  fundWalletWithXRP();
});

createwalletBtn.addEventListener("click", () => {
  createWallet();
});

async function connectXRPL() {
  await XRPLclient.connect();
}

function convertTimestampToReadableDate(timestamp) {
  const date = new Date(timestamp * 1000); // Convert to milliseconds by multiplying by 1000

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

async function getAndDisplayTransactions() {
  const userRef = db.collection("users").doc(auth.currentUser.email);
  const doc = await userRef.get();
  const transactions = await XRPLclient.request({
    command: "account_tx",
    account: doc.data().walletid,
    ledger_index_min: -1,
    ledger_index_max: -1,
    binary: false,
    limit: 10,
    forward: false,
  });
  console.log(transactions);
  transactions.result.transactions.forEach((transaction) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td class="px-6 py-4 whitespace-nowrap">
    <div class="text-sm text-white-900">
      ${transaction.tx.TransactionType}
    </div>
  </td>
  <td class="px-6 py-4 whitespace-nowrap">
    <div class="text-sm text-white-900">
      ${ transaction.tx.Amount - 10000000000 } XRP
    </div>
  </td>
  <td class="px-6 py-4 whitespace-nowrap">
    <div class="text-sm text-white-900">
      ${convertTimestampToReadableDate( transaction.tx.date )}
    </div>
  </td>
  <td class="px-6 py-4 whitespace-nowrap">
    <div class="text-sm text-white-900">${transaction.tx.Account}</div>
  </td>
  <td class="px-6 py-4 whitespace-nowrap">
    <div class="text-sm text-white-900">${ transaction.tx.Destination }</div>
  </td>
  <td class="px-6 py-4 whitespace-nowrap">
    <div class="text-sm text-white-900">${transaction.tx.hash}</div>
  </td>
    `;
    transactiontableBody.appendChild(tr);
  });
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
    await getAndDisplayTransactions();
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

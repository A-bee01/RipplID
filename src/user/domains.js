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
const domainGrid = document.querySelector("#domaingrid");
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

function formatDate(date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

function renewDomain(domain, purchaseDate, expiryDate) {
    swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        confirmButtonText: "OK",
        title: "Coming Soon!",
        text: "Sorry, Domain Renewal Not Available Yet",
        icon: "info",
      });
  }

async function getAndDisplayDomains() {
  const domainRef = db.collection("domains");
  domainRef
    .where("email", "==", auth.currentUser.email)
    .get()
    .then(async (querySnapshot) => {
      if (querySnapshot.empty) {
        const tr = document.createElement("div");
        tr.innerHTML = `
              No Domains
              `;

        domainGrid.appendChild(tr);
      } else {
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const purchaseDate = data.date.toDate();
          const expiryDate = new Date(purchaseDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          const tr = document.createElement("div");
          tr.innerHTML = `
      <div
      class="rounded-lg border text-card-foreground shadow-sm bg-gray-800"
      data-v0-t="card"
    >
      <div class="flex flex-col space-y-1.5 p-6">
        <h3
          class="text-2xl font-semibold leading-none tracking-tight text-white"
        >
          ${data.domain}
        </h3>
      </div>
      <div class="p-6">
        <p class="text-white">Purchased on:  ${formatDate(purchaseDate)}</p>
        <p class="text-white">Expires on: ${formatDate(expiryDate)}</p>
        <p class="text-white">Registrar: RipplID</p>
      </div>
      <div class="flex items-center p-6">
        <button
          class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-white border-green-500 bg-green-500"
          id="renewdomain"
        >
          Renew
        </button>
      </div>
    </div>
      `;

          domainGrid.appendChild(tr);
          const renewButton = document.querySelector("#renewdomain");
          renewButton.addEventListener("click", () => renewDomain(data.domain, formatDate(purchaseDate), formatDate(expiryDate)));
     
        });
      }
    });
}


async function fundWalletWithXRP() {
  const userRef = db.collection("users").doc(auth.currentUser.email);
  const doc = await userRef.get();
  if (doc.data().walletid == null) {
    swal.fire({
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      confirmButtonText: "OK",
      title: "No wallet",
      text: "Please a create wallet first",
      icon: "warning",
    });
  } else {
    swal.fire({
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      confirmButtonText: "OK",
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
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
                 icon: "info",
        title: "Incoming Transaction!",
        html: `Amount: <b>${
          account.result.account_data.Balance - 10000000000 - doc.data().balance
        } XRP</b>`,
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
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
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
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
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
    await getAndDisplayDomains();
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

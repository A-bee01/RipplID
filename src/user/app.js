import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

const auth = firebase.auth();
const db = firebase.firestore();
const PUBLIC_SERVER = "wss://xrplcluster.com/";
const XRPLclient = new xrpl.Client(PUBLIC_SERVER);
const balance = document.getElementById("balance");
const logoutButton = document.getElementById("logoutbtn");
const fundwalletBtn = document.getElementById("fundwallet");
const createwalletBtn = document.getElementById("connectwallet");
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

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

window.addEventListener("load", () => {
  connectXRPL();
  //getBalance();
});

async function connectXRPL() {
  await XRPLclient.connect();
}

// async function getBalance() {
//     const account = await client.getAccountInfo('rK8Jw3Z4jxw4d9gDx5kWqVYfVWw4K3hQg');
//     console.log(account.xrpBalance);
//   }

async function fundWalletWithXRP() {
    const userRef = db.collection("users").doc(auth.currentUser.email);
    const doc = await userRef.get();
  swal.fire({
    title: doc.data().walletid,
    text: "Send XRP to your address to fund your wallet",
    icon: "info",
  });
}

async function createWallet() {
  if (createwalletBtn.textContent == "Create Wallet") {
    const test_wallet = xrpl.Wallet.generate();
    const wallet = test_wallet;
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
        swal.fire({
          title: "Success!",
          text: "Wallet created successfully!",
          icon: "success",
          confirmButtonText: "OK",
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

onAuthStateChanged(auth, function (user) {
  if (user) {
    checkAuth(user);
    getUserData(user).then((data) => {
      balance.textContent = data.balance ? data.balance : 0;
      createwalletBtn.textContent = data.walletid
        ? data.walletid
        : "Create Wallet";
      if (/Mobile/.test(navigator.userAgent)) {
        if (createwalletBtn.textContent.length > 10) {
          createwalletBtn.textContent =
            createwalletBtn.textContent.substring(0, 10) + "...";
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

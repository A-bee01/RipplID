import {
    signOut,
    onAuthStateChanged,
  } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
  
  const auth = firebase.auth();
  const db = firebase.firestore();
  const PUBLIC_SERVER = "wss://xrplcluster.com/";
  const TEST_SERVER = "wss://s.altnet.rippletest.net:51233";
  const XRPLclient = new xrpl.Client(TEST_SERVER);
  const username = document.querySelector("#username");
  const usereamil = document.querySelector("#useremail");
  const walletid = document.querySelector("#walletid");
  const walletseed = document.querySelector("#seed");
  const walletpubkey = document.querySelector("#pubkey");
  const walletprk = document.querySelector("#prkey");
  const balance = document.querySelector("#balance");
  const balance2 = document.querySelector("#balance2");
  const usericon = document.querySelector("#usericon");
  const totaldomains = document.querySelector("#totaldomains");
  const logoutButton = document.querySelector("#logoutbtn");
  const fundwalletBtn = document.querySelector("#fundwallet");
  const createwalletBtn = document.querySelector("#connectwallet");
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
  
  async function fundWalletWithXRP() {
    const userRef = db.collection("users").doc(auth.currentUser.email);
    const doc = await userRef.get();
    if (doc.data().walletid == null) {
      swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        title: "No wallet",
        text: "Please a create wallet first",
        icon: "warning",
        confirmButtonText: "OK",
      });
    } else {
      swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        title: `<b style="font-size: smaller">${doc.data().walletid}</b>`,
        text: "Send XRP to your address to fund your wallet",
        icon: "info",
        confirmButtonText: "OK",
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
          title: "Incoming Transaction!",
          html: `Amount: <b>${
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
      balance2.textContent = account.result.account_data.Balance - 10000000000;
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
        username.textContent = data.displayName;
        usereamil.textContent = data.email;
        usericon.innerHTML = user.photoURL ? `<img src="${user.photoURL}" />` : `<b>${data.displayName.charAt(0).toUpperCase()}</b>`;
        walletid.textContent = data.walletid ? data.walletid.substring(0, 15) + "..." : "No wallet";
        walletseed.textContent = data.walletseed ? data.walletseed.substring(0, 15) + "..." : "No wallet";
        walletpubkey.textContent = data.walletpk ? data.walletpk.substring(0, 15) + "..." : "No wallet";
        walletprk.textContent = data.walletsk ? data.walletsk.substring(0, 15) + "..." : "No wallet";
        totaldomains.textContent = data.totaldomains ? data.totaldomains : 0;
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
  
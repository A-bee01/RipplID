import {
    signOut,
    onAuthStateChanged,
  } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
  
  const auth = firebase.auth();
  const db = firebase.firestore();
  const PUBLIC_SERVER = "wss://xrplcluster.com/";
  const TEST_SERVER = "wss://s.altnet.rippletest.net:51233";
  const XRPLclient = new xrpl.Client(TEST_SERVER);
  const username = document.getElementById("username");
  const usereamil = document.getElementById("useremail");
  const walletid = document.getElementById("walletid");
  const balance = document.getElementById("balance");
  const balance2 = document.getElementById("balance2");
  const usericon = document.getElementById("usericon");
  const totaldomains = document.getElementById("totaldomains");
  const logoutButton = document.getElementById("logoutbtn");
  const createwalletBtn = document.getElementById("connectwallet");
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  
  logoutButton.addEventListener("click", handleSignOut);
  
  menuToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
  
  async function connectXRPL() {
    await XRPLclient.connect();
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
      balance2.textContent = account.result.account_data.Balance - 10000000000;
    } catch (error) {
      console.error(error);
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
  
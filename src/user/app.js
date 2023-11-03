import {
    signOut,
    onAuthStateChanged,
  } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
  
  const auth = firebase.auth();
  const db = firebase.firestore();    
  const PUBLIC_SERVER = "wss://xrplcluster.com/"
  const client = new xrpl.Client(PUBLIC_SERVER)
  const balance = document.getElementById("balance");
  const logoutButton = document.getElementById("logoutbtn");
  const fundwalletBtn = document.getElementById("fundwallet");
  const connectwalletBtn = document.getElementById("connectwallet");
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  
logoutButton.addEventListener("click", handleSignOut);
  
menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

fundwalletBtn.addEventListener("click", () => {
        fundWalletWithXRP();
        }
    );

connectwalletBtn.addEventListener("click", () => {
        connectWallet();
        }
    );

 window.addEventListener('load', () => {
    connectXRPL();
    //getBalance();
  });

 async function connectXRPL() {
    await client.connect();
  }

// async function getBalance() {
//     const account = await client.getAccountInfo('rK8Jw3Z4jxw4d9gDx5kWqVYfVWw4K3hQg');
//     console.log(account.xrpBalance);
//   }

  function fundWalletWithXRP() {
    window.location.href = "/user/fundwallet";
  }

  function connectWallet() {
    const test_wallet = xrpl.Wallet.generate();
    const wallet = test_wallet;
    console.log(wallet);
    db.collection("users").doc(auth.currentUser.email).update({
        walletid: wallet.address,
        walletseed: wallet.seed,
        walletpk: wallet.publicKey,
        walletsk: wallet.privateKey,
        });
    
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
        balance.innerHTML = data.balance ? data.balance : 0;
        connectwalletBtn.innerHTML = data.walletid ? data.walletid : "Connect Wallet";
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
    signOut(auth).then(() => {
      // Sign-out successful.
      window.location.href = "/";
    }).catch((error) => {
      // An error happened.
      console.log(error);
    });
  }
  
import {
    signOut,
    onAuthStateChanged,
  } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
  
  const auth = firebase.auth();
  const db = firebase.firestore();
  const logoutButton = document.getElementById("logoutbtn");
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  
  logoutButton.addEventListener("click", handleSignOut);
  
  menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
  
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
        document.getElementById("balance").innerHTML = data.balance ? data.balance : 0;
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
  
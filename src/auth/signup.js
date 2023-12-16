import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  getRedirectResult,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";


const auth = firebase.auth();
const db = firebase.firestore();
const form = document.getElementById("form");
const emailInput = document.querySelector("#email");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const googleSignInButton = document.querySelector("#google-sign-in");
const signUpButton = document.querySelector("#register");

/**
 * Handles the sign up button press.
 */
function handleSignUp() {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
  });
  Swal.fire({
    title: "Please wait...",
    showConfirmButton: false,
    willOpen: () => {
      Swal.showLoading();
    },
  });
  const email = emailInput.value;
  const password = passwordInput.value;
  if (email.length < 4) {
    alert("Please enter an email address.");
    return;
  }
  if (password.length < 4) {
    alert("Please enter a password.");
    return;
  }
  // Create user with email and pass.
  createUserWithEmailAndPassword(auth, email, password).catch(function (
    error
  ) {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    if (errorCode === "auth/account-exists-with-different-credential") {
      swal
        .fire({
          title: "Error",
          text: "Account already exists with different credential",
          icon: "error",
          confirmButtonText: "Ok",
        });
      // If you are using multiple auth providers on your app you should handle linking
      // the user's accounts here.
    } else if (errorCode === "auth/invalid-login-credentials") {
      swal
        .fire({
          title: "Error",
          text: "Invalid login credentials",
          icon: "error",
          confirmButtonText: "Ok",
        });
    } else if (errorCode === "auth/invalid-email") {
      swal
        .fire({
          title: "Error",
          text: "Invalid email",
          icon: "error",
          confirmButtonText: "Ok",
        });
    } else if (errorCode === "auth/wrong-password") {
      swal
        .fire({
          title: "Error",
          text: "Wrong password",
          icon: "error",
          confirmButtonText: "Ok",
        });
    } else if (errorCode === "auth/user-not-found") {
      swal
        .fire({
          title: "Error",
          text: "User not found",
          icon: "error",
          confirmButtonText: "Ok",
        });
    } else if (errorCode === "auth/weak-password") {
      swal
        .fire({
          title: "Error",
          text: "Weak password",
          icon: "error",
          confirmButtonText: "Ok",
        });
    } else if (errorCode === "auth/email-already-in-use") {
      swal
        .fire({
          title: "Error",
          text: "Email already in use",
          icon: "error",
          confirmButtonText: "Ok",
        });
    } else if (errorCode === "auth/operation-not-allowed") {
      swal
        .fire({
          title: "Error",
          text: "Operation not allowed",
          icon: "error",
          confirmButtonText: "Ok",
        });
    } else if (errorCode === "auth/weak-password") {
      swal
        .fire({
          title: "Error",
          text: "Weak password",
          icon: "error",
          confirmButtonText: "Ok",
        });
    } else {
      swal
        .fire({
          title: "Error",
          text: "Something went wrong",
          icon: "error",
          confirmButtonText: "Ok",
        });
    }
    console.log(error);
  });
}

/**
 * Sends an email verification to the user.
 */
function sendVerificationEmailToUser() {
  sendEmailVerification(auth.currentUser).then(function () {
    // Email Verification sent!
    swal
      .fire({
        title: "Success!",
        text: "Verification email sent!",
        icon: "success",
        confirmButtonText: "OK",
      });
  });
}

function sendPasswordReset() {
  const email = emailInput.value;
  sendPasswordResetEmail(auth, email)
    .then(function () {
      // Password Reset Email Sent!
      alert("Password Reset Email Sent!");
    })
    .catch(function (error) {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      if (errorCode == "auth/invalid-email") {
        alert(errorMessage);
      } else if (errorCode == "auth/user-not-found") {
        alert(errorMessage);
      }
      console.log(error);
    });
}

function addUserToFirestore(user) {
  console.log(user);
  const users = db.collection("users");
  users
    .doc(user.email)
    .set({
      email: user.email,
      uid: user.uid,
      isverified: user.emailVerified,
      photoURL: user.photoURL,
      displayName: usernameInput ? usernameInput.value : user.displayName,
      totaldomains: 0,
    })
    .then(() => {
      console.log("Document successfully written!");
      if (user.emailVerified) {
        swal
          .fire({
            title: "Success!",
            text: "You have successfully registered!",
            icon: "success",
            confirmButtonText: "Login",
          });
      } else {
        swal
          .fire({
            title: "Success!",
            text: "You have successfully registered!\nPlease verify your email to login",
            icon: "success",
            confirmButtonText: "Verify Email",
          })
          .then((result) => {
            if (result.isConfirmed) {
              sendVerificationEmailToUser();
            }
          });
      }
    })
    .catch((error) => {
      console.error("Error writing document: ", error);
    });
}

function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/plus.login");
  signInWithRedirect(auth, provider);
}

getRedirectResult(auth)
  .then((result) => {
    if (auth.currentUser) {
      signOut(auth);
    }
    if (result.credential) {
      // This gives you a Google Access Token.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
    }
    const user = result.user;
    addUserToFirestore(user);
  })
  .catch((error) => {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.
    const email = error.email;
    // The AuthCredential type that was used.
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.log(errorMessage);
    // ...
  });

// Listening for auth state changes.
onAuthStateChanged(auth, function (user) {
  if (user) {
    addUserToFirestore(user);
  } else {
  }
});

signUpButton.addEventListener("click", handleSignUp, false);
googleSignInButton.addEventListener("click", signInWithGoogle, false);
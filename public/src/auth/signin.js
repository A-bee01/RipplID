import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  sendEmailVerification,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyDj_1vWuONl5K8XfEnQ4iHHDQYr6BBOd5g",
    authDomain: "xrpl-ns.firebaseapp.com",
    projectId: "xrpl-ns",
    storageBucket: "xrpl-ns.appspot.com",
    messagingSenderId: "118935206366",
    appId: "1:118935206366:web:7f5bb38cc236fecf9e454f",
    measurementId: "G-JGECZ5R0ND",
  };
  
firebase.initializeApp(firebaseConfig);

const auth = getAuth();
const db = firebase.firestore();
const GooglesignInButton = document.getElementById("google-sign-in");
const form = document.getElementById("form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signUpButton = document.getElementById("login");

/**
 * Function called when clicking the Login/Logout button.
 */
function toggleSignIn() {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
  });
  if (!auth.currentUser) {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/plus.login");
    signInWithRedirect(auth, provider);
  } else {
    signOut(auth);
  }
}

function toggleSignInManual() {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
  });
  if (auth.currentUser) {
    signOut(auth);
  } else {
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
    // Sign in with email and pass.
    signInWithEmailAndPassword(auth, email, password).catch(function (error) {
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
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
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
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      } else if (errorCode === "auth/invalid-email") {
        swal
          .fire({
            title: "Error",
            text: "Invalid email",
            icon: "error",
            confirmButtonText: "Ok",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      } else if (errorCode === "auth/wrong-password") {
        swal
          .fire({
            title: "Error",
            text: "Wrong password",
            icon: "error",
            confirmButtonText: "Ok",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      } else if (errorCode === "auth/user-not-found") {
        swal
          .fire({
            title: "Error",
            text: "User not found",
            icon: "error",
            confirmButtonText: "Ok",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      } else if (errorCode === "auth/weak-password") {
        swal
          .fire({
            title: "Error",
            text: "Weak password",
            icon: "error",
            confirmButtonText: "Ok",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      } else if (errorCode === "auth/email-already-in-use") {
        swal
          .fire({
            title: "Error",
            text: "Email already in use",
            icon: "error",
            confirmButtonText: "Ok",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      } else if (errorCode === "auth/operation-not-allowed") {
        swal
          .fire({
            title: "Error",
            text: "Operation not allowed",
            icon: "error",
            confirmButtonText: "Ok",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      } else if (errorCode === "auth/weak-password") {
        swal
          .fire({
            title: "Error",
            text: "Weak password",
            icon: "error",
            confirmButtonText: "Ok",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      } else {
        swal
          .fire({
            title: "Error",
            text: "Something went wrong",
            icon: "error",
            confirmButtonText: "Ok",
          })
          .then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/public/auth/login";
            }
          });
      }
      console.log(error);
    });
  }
}

// Result from Redirect auth flow.
getRedirectResult(auth)
  .then(function (result) {
    if (!result) return;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential) {
      swal
        .fire({
          title: "Success",
          text: "You have successfully logged in",
          icon: "success",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/dashbord";
          }
        });
      // This gives you a Google Access Token. You can use it to access the Google API.
      const token = credential?.accessToken;
      // oauthToken.textContent = token ?? '';
    } else {
    }
    // The signed-in user info.
    const user = result.user;
  })
  .catch(function (error) {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.

    // The firebase.auth.AuthCredential type that was used.
    const credential = error.credential;
    if (errorCode === "auth/account-exists-with-different-credential") {
      swal
        .fire({
          title: "Error",
          text: "Account already exists with different credential",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
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
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    } else if (errorCode === "auth/invalid-email") {
      swal
        .fire({
          title: "Error",
          text: "Invalid email",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    } else if (errorCode === "auth/wrong-password") {
      swal
        .fire({
          title: "Error",
          text: "Wrong password",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    } else if (errorCode === "auth/user-not-found") {
      swal
        .fire({
          title: "Error",
          text: "User not found",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    } else if (errorCode === "auth/weak-password") {
      swal
        .fire({
          title: "Error",
          text: "Weak password",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    } else if (errorCode === "auth/email-already-in-use") {
      swal
        .fire({
          title: "Error",
          text: "Email already in use",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    } else if (errorCode === "auth/operation-not-allowed") {
      swal
        .fire({
          title: "Error",
          text: "Operation not allowed",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    } else if (errorCode === "auth/weak-password") {
      swal
        .fire({
          title: "Error",
          text: "Weak password",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    } else {
      swal
        .fire({
          title: "Error",
          text: "Something went wrong",
          icon: "error",
          confirmButtonText: "Ok",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    }
  });

  function sendVerificationEmailToUser() {
    sendEmailVerification(auth.currentUser).then(function () {
      // Email Verification sent!
      swal
        .fire({
          title: "Success!",
          text: "Verification email sent!",
          icon: "success",
          confirmButtonText: "OK",
        })
        .then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/public/auth/login";
          }
        });
    });
  }

// Listening for auth state changes.
onAuthStateChanged(auth, function (user) {
  if (user) {
    if (user.emailVerified) {
        const users = db.collection("users");
        users
            .doc(user.email)
            .get()
            .then((doc) => {
                if (doc.exists) {
                console.log("Document data:", doc.data());
                } else {
                // doc.data() will be undefined in this case
                console.log("No such document!");
                users.doc(user.uid).update({
                    isverified: true,
                });
                }
            })
            .catch((error) => {
                console.log("Error getting document:", error);
            });
        swal
      .fire({
        title: "Success",
        text: "You have successfully logged in",
        icon: "success",
        confirmButtonText: "Ok",
      })
      .then((result) => {
        if (result.isConfirmed) {
          window.location.href = "/public/dashbord";
        }
      });
    } else {
        swal
            .fire({
            title: "Error",
            text: "Please verify your email address",
            icon: "error",
            confirmButtonText: "Verify",
            })
            .then((result) => {
            if (result.isConfirmed) {
                sendVerificationEmailToUser();
            }
            });
    }
    
  } else {
  }
});

GooglesignInButton.addEventListener("click", toggleSignIn, false);
signUpButton.addEventListener("click", toggleSignInManual, false);

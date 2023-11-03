import {signOut} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";


const auth = firebase.auth();
const db = firebase.firestore();
const user = auth.currentUser;

//get user data from firestore
const getUserData = async () => {
    const userRef = db.collection("users").doc(user.email);
    const doc = await userRef.get();
    if (!doc.exists) {
        console.log("No such document!");
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
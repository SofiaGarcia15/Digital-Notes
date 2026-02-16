import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDASFQhPhBse69zrMy5iy028KqFVGxTALg",
  authDomain: "digital-notes-7cfc0.firebaseapp.com",
  projectId: "digital-notes-7cfc0",
  storageBucket: "digital-notes-7cfc0.firebasestorage.app",
  messagingSenderId: "206304200598",
  appId: "1:206304200598:web:61586d1fa6e33a5655bfb7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authSection = document.getElementById("authSection");
const notesSection = document.getElementById("notesSection");
const authMessage = document.getElementById("authMessage");
const currentUser = document.getElementById("currentUser");

const showRegisterBtn = document.getElementById("showRegisterBtn");
const showLoginBtn = document.getElementById("showLoginBtn");

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

const registerName = document.getElementById("registerName");
const registerAge = document.getElementById("registerAge");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const notesList = document.getElementById("notesList");
const logoutBtn = document.getElementById("logoutBtn");

let unsubscribeNotes = null;

function showMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `message ${type}`.trim();
}

function switchAuthTab(tab) {
  if (tab === "register") {
    registerForm.classList.add("active");
    loginForm.classList.remove("active");
    showRegisterBtn.classList.add("active");
    showLoginBtn.classList.remove("active");
    return;
  }

  registerForm.classList.remove("active");
  loginForm.classList.add("active");
  showRegisterBtn.classList.remove("active");
  showLoginBtn.classList.add("active");
}

function renderNotes(documents) {
  notesList.innerHTML = "";

  if (documents.length === 0) {
    notesList.innerHTML = "<li class='note-item'><p>Aún no tienes notas guardadas.</p></li>";
    return;
  }

  for (const noteDoc of documents) {
    const note = noteDoc.data();
    const li = document.createElement("li");
    li.className = "note-item";

    const createdAt = note.createdAt?.toDate?.();
    const dateLabel = createdAt ? createdAt.toLocaleString("es-ES") : "Guardando fecha...";

    li.innerHTML = `
      <h3>${note.title}</h3>
      <p>${note.content}</p>
      <span class="note-date">Creada: ${dateLabel}</span>
    `;

    notesList.appendChild(li);
  }
}

showRegisterBtn.addEventListener("click", () => switchAuthTab("register"));
showLoginBtn.addEventListener("click", () => switchAuthTab("login"));

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nombre = registerName.value.trim();
  const edad = Number(registerAge.value);
  const email = registerEmail.value.trim();
  const password = registerPassword.value;

  if (!nombre) {
    showMessage("El nombre es obligatorio.", "error");
    return;
  }

  if (!Number.isInteger(edad) || edad < 1) {
    showMessage("Ingresa una edad válida.", "error");
    return;
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    await setDoc(doc(db, "usuarios", uid), {
      uid,
      nombre,
      edad,
      email,
      creadoEn: serverTimestamp()
    });

    showMessage("Registro exitoso. Ya puedes iniciar sesión.", "success");
    registerForm.reset();
    switchAuthTab("login");
    loginEmail.value = email;
  } catch (error) {
    showMessage(`Error en registro: ${error.message}`, "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
    showMessage("Login correcto.", "success");
    loginForm.reset();
  } catch (error) {
    showMessage(`Error al iniciar sesión: ${error.message}`, "error");
  }
});

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    showMessage("Debes iniciar sesión.", "error");
    return;
  }

  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();

  if (!title || !content) {
    return;
  }

  try {
    await addDoc(collection(db, "notas"), {
      uid: user.uid,
      title,
      content,
      createdAt: serverTimestamp()
    });

    noteForm.reset();
  } catch (error) {
    showMessage(`No se pudo guardar la nota: ${error.message}`, "error");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }

  if (user) {
    authSection.classList.add("hidden");
    notesSection.classList.remove("hidden");
    currentUser.textContent = `Sesión: ${user.email}`;

    const notesQuery = query(
      collection(db, "notas"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      renderNotes(snapshot.docs);
    });

    return;
  }

  authSection.classList.remove("hidden");
  notesSection.classList.add("hidden");
  currentUser.textContent = "";
  notesList.innerHTML = "";
});

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
  query,
  where,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc
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

const authCard = document.getElementById("authCard");
const notesCard = document.getElementById("notesCard");
const authMessage = document.getElementById("authMessage");
const currentUser = document.getElementById("currentUser");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const notesList = document.getElementById("notesList");

let unsubscribeNotes = null;

function showMessage(message, type = "muted") {
  authMessage.textContent = message;
  authMessage.className = type;
}

function renderNotes(docs) {
  notesList.innerHTML = "";

  if (docs.length === 0) {
    notesList.innerHTML = "<li class='muted'>Todavía no tienes notas.</li>";
    return;
  }

  docs.forEach((noteDoc) => {
    const note = noteDoc.data();
    const li = document.createElement("li");

    const createdAt = note.createdAt?.toDate?.();
    const createdLabel = createdAt
      ? createdAt.toLocaleString("es-ES")
      : "Guardando fecha...";

    li.innerHTML = `
      <div class="note-header">
        <strong>${note.title}</strong>
        <button class="secondary" data-id="${noteDoc.id}" style="width:auto;">Eliminar</button>
      </div>
      <p>${note.content}</p>
      <p class="muted">Creada: ${createdLabel}</p>
    `;

    notesList.appendChild(li);
  });

  notesList.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const noteId = button.dataset.id;
      await deleteDoc(doc(db, "notes", noteId));
    });
  });
}

registerBtn.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    showMessage("Usuario registrado correctamente.", "success");
  } catch (error) {
    showMessage(`Error al registrar: ${error.message}`, "error");
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    showMessage("Login correcto.", "success");
  } catch (error) {
    showMessage(`Error al iniciar sesión: ${error.message}`, "error");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  showMessage("Sesión cerrada.", "muted");
});

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    showMessage("Debes iniciar sesión.", "error");
    return;
  }

  await addDoc(collection(db, "notes"), {
    uid: user.uid,
    title: noteTitle.value.trim(),
    content: noteContent.value.trim(),
    createdAt: serverTimestamp()
  });

  noteForm.reset();
});

onAuthStateChanged(auth, (user) => {
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }

  if (user) {
    authCard.classList.add("hidden");
    notesCard.classList.remove("hidden");
    currentUser.textContent = `Conectado como: ${user.email}`;

    const q = query(collection(db, "notes"), where("uid", "==", user.uid));
    unsubscribeNotes = onSnapshot(q, (snapshot) => {
      const docs = [...snapshot.docs].sort((a, b) => {
        const aTime = a.data().createdAt?.seconds ?? 0;
        const bTime = b.data().createdAt?.seconds ?? 0;
        return bTime - aTime;
      });
      renderNotes(docs);
    });

    return;
  }

  authCard.classList.remove("hidden");
  notesCard.classList.add("hidden");
  currentUser.textContent = "";
  notesList.innerHTML = "";
});

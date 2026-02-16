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
  orderBy,
  updateDoc,
  deleteDoc,
  getDoc
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
const notesMessage = document.getElementById("notesMessage");
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
const noteCategory = document.getElementById("noteCategory");
const noteContent = document.getElementById("noteContent");
const notePinned = document.getElementById("notePinned");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const totalNotes = document.getElementById("totalNotes");
const pinnedNotes = document.getElementById("pinnedNotes");
const categoryCount = document.getElementById("categoryCount");

const notesList = document.getElementById("notesList");
const logoutBtn = document.getElementById("logoutBtn");

let unsubscribeNotes = null;
let notesCache = [];

function showMessage(target, message, type = "") {
  target.textContent = message;
  target.className = `message ${type}`.trim();
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

function formatDate(value) {
  const date = value?.toDate?.() || null;
  return date ? date.toLocaleString("es-ES") : "Guardando fecha...";
}

function updateStats(notes) {
  totalNotes.textContent = String(notes.length);
  pinnedNotes.textContent = String(notes.filter((note) => note.pinned).length);

  const categories = new Set(
    notes
      .map((note) => note.category?.trim().toLowerCase())
      .filter(Boolean)
  );

  categoryCount.textContent = String(categories.size);
}

function getFilteredNotes() {
  const keyword = searchInput.value.trim().toLowerCase();
  const sortValue = sortSelect.value;

  const filtered = notesCache.filter((noteDoc) => {
    const note = noteDoc.data();
    if (!keyword) {
      return true;
    }

    return (
      note.title.toLowerCase().includes(keyword)
      || note.content.toLowerCase().includes(keyword)
      || (note.category || "").toLowerCase().includes(keyword)
    );
  });

  filtered.sort((a, b) => {
    const noteA = a.data();
    const noteB = b.data();

    const timeA = noteA.createdAt?.seconds || 0;
    const timeB = noteB.createdAt?.seconds || 0;

    if (sortValue === "oldest") {
      return timeA - timeB;
    }

    if (sortValue === "pinned") {
      if (Boolean(noteA.pinned) !== Boolean(noteB.pinned)) {
        return noteA.pinned ? -1 : 1;
      }
      return timeB - timeA;
    }

    return timeB - timeA;
  });

  return filtered;
}

function createNoteElement(noteDoc) {
  const note = noteDoc.data();
  const li = document.createElement("li");
  li.className = "note-item";
  li.dataset.noteId = noteDoc.id;

  const top = document.createElement("div");
  top.className = "note-top";

  const titleWrapper = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = note.title;
  titleWrapper.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "note-meta";

  if (note.category) {
    const categoryTag = document.createElement("span");
    categoryTag.className = "note-tag";
    categoryTag.textContent = note.category;
    meta.appendChild(categoryTag);
  }

  if (note.pinned) {
    const pinnedTag = document.createElement("span");
    pinnedTag.className = "note-tag";
    pinnedTag.textContent = "Destacada";
    meta.appendChild(pinnedTag);
  }

  const content = document.createElement("p");
  content.textContent = note.content;

  const date = document.createElement("span");
  date.className = "note-date";
  date.textContent = `Creada: ${formatDate(note.createdAt)}`;

  const actions = document.createElement("div");
  actions.className = "note-actions";

  const pinButton = document.createElement("button");
  pinButton.type = "button";
  pinButton.className = "ghost-btn";
  pinButton.dataset.action = "toggle-pin";
  pinButton.textContent = note.pinned ? "Quitar destacada" : "Destacar";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "ghost-btn";
  editButton.dataset.action = "edit";
  editButton.textContent = "Editar";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "ghost-btn";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "Eliminar";

  top.append(titleWrapper, meta);
  actions.append(pinButton, editButton, deleteButton);
  li.append(top, content, date, actions);

  return li;
}

function renderNotes() {
  const filteredNotes = getFilteredNotes();
  notesList.innerHTML = "";

  if (filteredNotes.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "note-item";
    emptyItem.textContent = notesCache.length === 0
      ? "Aún no tienes notas guardadas."
      : "No se encontraron notas para ese filtro.";
    notesList.appendChild(emptyItem);
    return;
  }

  for (const noteDoc of filteredNotes) {
    notesList.appendChild(createNoteElement(noteDoc));
  }
}

async function loadUserProfile(user) {
  const profileRef = doc(db, "usuarios", user.uid);

  try {
    const profileSnapshot = await getDoc(profileRef);

    if (!profileSnapshot.exists()) {
      currentUser.textContent = `Sesión: ${user.email}`;
      return;
    }

    const profile = profileSnapshot.data();
    currentUser.textContent = `Sesión: ${profile.nombre || user.email} · ${user.email} · ${profile.edad || "-"} años`;
  } catch (error) {
    currentUser.textContent = `Sesión: ${user.email}`;
    showMessage(notesMessage, `No se pudo cargar el perfil: ${error.message}`, "error");
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
    showMessage(authMessage, "El nombre es obligatorio.", "error");
    return;
  }

  if (!Number.isInteger(edad) || edad < 1) {
    showMessage(authMessage, "Ingresa una edad válida.", "error");
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

    showMessage(authMessage, "Registro exitoso. Ya puedes iniciar sesión.", "success");
    registerForm.reset();
    switchAuthTab("login");
    loginEmail.value = email;
  } catch (error) {
    showMessage(authMessage, `Error en registro: ${error.message}`, "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
    showMessage(authMessage, "Login correcto.", "success");
    loginForm.reset();
  } catch (error) {
    showMessage(authMessage, `Error al iniciar sesión: ${error.message}`, "error");
  }
});

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    showMessage(notesMessage, "Debes iniciar sesión.", "error");
    return;
  }

  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();
  const category = noteCategory.value.trim();
  const pinned = notePinned.checked;

  if (!title || !content) {
    showMessage(notesMessage, "Completa el título y contenido.", "error");
    return;
  }

  try {
    await addDoc(collection(db, "notas"), {
      uid: user.uid,
      title,
      content,
      category,
      pinned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    noteForm.reset();
    showMessage(notesMessage, "Nota guardada correctamente.", "success");
  } catch (error) {
    showMessage(notesMessage, `No se pudo guardar la nota: ${error.message}`, "error");
  }
});

searchInput.addEventListener("input", renderNotes);
sortSelect.addEventListener("change", renderNotes);

notesList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  if (!action) {
    return;
  }

  const noteItem = target.closest("[data-note-id]");
  const noteId = noteItem?.dataset.noteId;

  if (!noteId) {
    return;
  }

  const noteRef = doc(db, "notas", noteId);
  const noteDoc = notesCache.find((item) => item.id === noteId);

  if (!noteDoc) {
    return;
  }

  const note = noteDoc.data();

  try {
    if (action === "delete") {
      const confirmed = window.confirm("¿Eliminar esta nota?");
      if (!confirmed) {
        return;
      }

      await deleteDoc(noteRef);
      showMessage(notesMessage, "Nota eliminada.", "success");
      return;
    }

    if (action === "toggle-pin") {
      await updateDoc(noteRef, {
        pinned: !note.pinned,
        updatedAt: serverTimestamp()
      });

      showMessage(notesMessage, "Estado de destacada actualizado.", "success");
      return;
    }

    if (action === "edit") {
      const newTitle = window.prompt("Nuevo título:", note.title);
      if (newTitle === null) {
        return;
      }

      const newContent = window.prompt("Nuevo contenido:", note.content);
      if (newContent === null) {
        return;
      }

      const newCategory = window.prompt("Nueva categoría:", note.category || "");
      if (newCategory === null) {
        return;
      }

      await updateDoc(noteRef, {
        title: newTitle.trim() || note.title,
        content: newContent.trim() || note.content,
        category: newCategory.trim(),
        updatedAt: serverTimestamp()
      });

      showMessage(notesMessage, "Nota actualizada.", "success");
    }
  } catch (error) {
    showMessage(notesMessage, `No se pudo completar la acción: ${error.message}`, "error");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  showMessage(authMessage, "Sesión cerrada.");
});

onAuthStateChanged(auth, async (user) => {
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }

  if (user) {
    authSection.classList.add("hidden");
    notesSection.classList.remove("hidden");
    showMessage(notesMessage, "", "");

    await loadUserProfile(user);

    const notesQuery = query(
      collection(db, "notas"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      notesCache = snapshot.docs;
      updateStats(snapshot.docs.map((noteDoc) => noteDoc.data()));
      renderNotes();
    }, (error) => {
      showMessage(notesMessage, `Error al cargar notas: ${error.message}`, "error");
    });

    return;
  }

  notesCache = [];
  authSection.classList.remove("hidden");
  notesSection.classList.add("hidden");
  currentUser.textContent = "";
  notesList.innerHTML = "";
  totalNotes.textContent = "0";
  pinnedNotes.textContent = "0";
  categoryCount.textContent = "0";
  searchInput.value = "";
  sortSelect.value = "newest";
});

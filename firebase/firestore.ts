import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  limit,
  orderBy, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase/firebase";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface Blog {
  id: string;
  title: string;
  slug: string;
  keywords: string;
  excerpt?: string;
  content: string;
  image?: string;
  categoryId: string;
  authorId?: string;
  authorName?: string;
  status: 'published' | 'draft';
  date: any;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  admin: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  status?: 'published' | 'draft';
  createdAt?: Timestamp;
}

export interface Subscription {
  id: string;
  email: string;
  name: string;
  phone: string;
  petBreed: string;
  subscribedAt: any;
}

export interface PetFeed {
  id?: string;
  name: string;
  phone: string;
  petBreed: string;
  petName: string;
  mealDays: number;
  reminders: boolean;
  subscribe: boolean;
  createdAt?: any;
}

// ── USER OPERATIONS ──────────────────────────────────────────────────────────

export const getAdminUsers = async () => {
  const usersQuery = query(collection(db, "users"), where("admin", "==", true));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as UserProfile));
};

export const getAppUsers = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as UserProfile));
};

export const updateUserRole = async (userId: string, isAdmin: boolean) => {
  const docRef = doc(db, "users", userId);
  return await updateDoc(docRef, { admin: isAdmin });
};

export const deleteUser = async (userId: string) => {
  const docRef = doc(db, "users", userId);
  return await deleteDoc(docRef);
};

// ── BLOG OPERATIONS ──────────────────────────────────────────────────────────

export const getBlogs = async () => {
  const blogsQuery = query(collection(db, "blogs"), orderBy("date", "desc"));
  const snapshot = await getDocs(blogsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Format date for the UI
    date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString().split('T')[0] : doc.data().date
  } as Blog));
};

export const getBlog = async (id: string) => {
  const docRef = doc(db, "blogs", id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    return { 
      id: snapshot.id, 
      ...data,
      date: data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : data.date
    } as Blog;
  }
  return null;
};

export const addBlog = async (blog: Omit<Blog, "id" | "date">) => {
  return await addDoc(collection(db, "blogs"), {
    ...blog,
    date: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateBlog = async (id: string, blog: Partial<Blog>) => {
  const docRef = doc(db, "blogs", id);
  return await updateDoc(docRef, {
    ...blog,
    updatedAt: serverTimestamp(),
  });
};

export const deleteBlog = async (id: string) => {
  const docRef = doc(db, "blogs", id);
  return await deleteDoc(docRef);
};

export const getBlogBySlug = async (slug: string): Promise<Blog | null> => {
  const q = query(collection(db, "blogs"), where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  const data = docData.data();
  return { 
    id: docData.id, 
    ...data,
    date: data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : data.date
  } as Blog;
};

// ── CATEGORY OPERATIONS ──────────────────────────────────────────────────────

export const getCategories = async () => {
  const snapshot = await getDocs(collection(db, "categories"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Category));
};

export const getCategory = async (id: string) => {
  const docRef = doc(db, "categories", id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Category;
  }
  return null;
};

export const addCategory = async (category: Omit<Category, "id">) => {
  return await addDoc(collection(db, "categories"), {
    ...category,
    createdAt: serverTimestamp(),
  });
};

export const updateCategory = async (id: string, category: Partial<Category>) => {
  const docRef = doc(db, "categories", id);
  return await updateDoc(docRef, category);
};

export const deleteCategory = async (id: string) => {
  const docRef = doc(db, "categories", id);
  return await deleteDoc(docRef);
};

// ── SUBSCRIPTION OPERATIONS ──────────────────────────────────────────────────

export const getSubscriptions = async () => {
  const q = query(collection(db, "subscriptions"), orderBy("subscribedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    subscribedAt: doc.data().subscribedAt?.toDate ? doc.data().subscribedAt.toDate().toISOString() : doc.data().subscribedAt
  } as Subscription));
};

export const addSubscription = async (sub: Omit<Subscription, "id" | "subscribedAt">) => {
  return await addDoc(collection(db, "subscriptions"), {
    ...sub,
    subscribedAt: serverTimestamp(),
  });
};

// ── PET FEED OPERATIONS ─────────────────────────────────────────────────────

export const savePetFeed = async (data: PetFeed) => {
  return await addDoc(collection(db, "petFeeds"), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

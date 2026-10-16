import { createBrowserRouter } from "react-router-dom";
import { RequireAuth, RequireRole } from "./auth/guards";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import LibraryPage from "./pages/LibraryPage";
import BrowsePage from "./pages/BrowsePage";
import BookPage from "./pages/BookPage";
import BookFormPage from "./pages/BookFormPage";
import ShelvesPage from "./pages/ShelvesPage";
import ShelfPage from "./pages/ShelfPage";
import ProfilePage from "./pages/ProfilePage";
import AdminUsersPage from "./pages/AdminUsersPage";
import NotFoundPage from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "library", element: <LibraryPage /> },
          { path: "books", element: <BrowsePage /> },
          { path: "books/new", element: <BookFormPage /> },
          { path: "books/:id", element: <BookPage /> },
          {
            element: <RequireRole roles={["moderator", "admin"]} />,
            children: [{ path: "books/:id/edit", element: <BookFormPage /> }],
          },
          { path: "shelves", element: <ShelvesPage /> },
          { path: "shelves/:id", element: <ShelfPage /> },
          { path: "u/:username", element: <ProfilePage /> },
          {
            element: <RequireRole roles={["admin"]} />,
            children: [{ path: "admin/users", element: <AdminUsersPage /> }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

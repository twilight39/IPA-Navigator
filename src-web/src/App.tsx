import "./App.css";
import { RouterProvider } from "@tanstack/react-router";
import { useStoreUserEffect } from "./hooks/useStoreUserEffect.tsx";

import { router } from "./router.tsx";

const App = () => {
  const { isLoading, isAuthenticated } = useStoreUserEffect();

  return <RouterProvider router={router} context={{}}></RouterProvider>;
};

export default App;

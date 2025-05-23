import "./App.css";
import { RouterProvider } from "@tanstack/react-router";

import { router } from "./router.tsx";

const App = () => {
  return <RouterProvider router={router} context={{}}></RouterProvider>;
};

export default App;

import { Navigate, Route, Routes } from "react-router";
import AppNavbar from "./components/layout/AppNavbar";
import { AppProvider } from "./context/AppProvider.tsx";
import CreateParchePage from "./pages/CreateParchePage";
import CreatePlanPage from "./pages/CreatePlanPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ParcheDetailsPage from "./pages/ParcheDetailsPage";
import PlanDetailsPage from "./pages/PlanDetailsPage";
import RankingsPage from "./pages/RankingsPage";
import RegisterPage from "./pages/RegisterPage";
//import { apiFetch } from "./services/apiClient";

export default function App() {
  //console.log("API URL:", import.meta.env.VITE_API_URL); este es para probar que si esta leyendo la variable de entorno.
  // **** Este código es solo para probar la conexión con la API. *** //
    // async function testApi() {
    // try {
    //   const result = await apiFetch("/api/Auth/login", {
    //     method: "POST",
    //     body: JSON.stringify({
    //       email: "carlos@sizas",
    //       password: "Web@1234",
    //     }),
    //   });

    //   console.log("Login OK:", result);
    //   localStorage.setItem("token", result.token);
    // } catch (error) {
    //   console.error("Error probando API:", error);
    // }
  // } **** Fin del código de prueba. *** //
  return (
    <AppProvider>
        {/* <button onClick={testApi}> Este botón es solo para probar la conexión con la API.
          Probar API
        </button> */}
      <AppNavbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/parches/new" element={<CreateParchePage />} />
        <Route path="/parches/:id" element={<ParcheDetailsPage />} />
        <Route path="/parches/:id/plans/new" element={<CreatePlanPage />} />
        <Route path="/plans/:id" element={<PlanDetailsPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}


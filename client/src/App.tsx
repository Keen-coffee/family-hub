import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/Calendar';
import MealsPage from './pages/Meals';
import GroceryPage from './pages/Grocery';
import RecipesPage from './pages/Recipes';
import ChoresPage from './pages/Chores';
import TasksPage from './pages/Tasks';
import SettingsPage from './pages/Settings';
import BabysitterPage from './pages/Babysitter';
import { usePrefetchAll } from './hooks/usePrefetchAll';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

function AppRoutes() {
  usePrefetchAll();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="meals" element={<MealsPage />} />
          <Route path="grocery" element={<GroceryPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="chores" element={<ChoresPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="babysitter" element={<BabysitterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}

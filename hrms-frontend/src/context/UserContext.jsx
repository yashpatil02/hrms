import { createContext, useContext, useState, useCallback } from "react";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  /* Call this whenever profile is updated — updates state + localStorage */
  const updateUser = useCallback((updates) => {
    setUserState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  /* Call this on logout to wipe state */
  const clearUser = useCallback(() => {
    setUserState({});
  }, []);

  return (
    <UserContext.Provider value={{ user, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

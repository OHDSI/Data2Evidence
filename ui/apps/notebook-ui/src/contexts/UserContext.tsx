import React, { createContext, FC, ReactNode, useContext } from "react";

interface User {
  username?: string;
  idpUserId?: string;
}

interface UserContextValue {
  user: User;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: FC<{ children: ReactNode; username?: string }> = ({ children, username }) => {
  const user: User = {
    username,
    idpUserId: username, // Use username as idpUserId for now
  };

  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

declare global {
  namespace Express {
    interface CurrentUser {
      id: string;
      username: string;
      role: string;
      currentStoreId: string | null;
      isDirector: boolean;
      status: string;
    }

    interface Request {
      requestId: string;
      currentUser?: CurrentUser;
    }
  }
}

export {};

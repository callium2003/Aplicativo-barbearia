/** @param {(action: "reload" | "sign-out") => void} navigate */
export function createSessionNavigationHandler(navigate) {
  let previousUserId;
  return (event, session) => {
    if (event === "SIGNED_OUT") { navigate("sign-out"); return; }
    const userId = session?.user?.id ?? null;
    if (previousUserId === undefined) {
      previousUserId = userId;
      return;
    }
    const changedAccount = userId !== previousUserId;
    previousUserId = userId;
    // SIGNED_IN can repeat on tab focus. Only an identity change or an
    // explicit profile update requires the route guards to run again.
    if (changedAccount || event === "USER_UPDATED") navigate("reload");
  };
}

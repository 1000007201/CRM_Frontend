// Convenience re-export so components can do:
//   import { useAuth } from "@/hooks/useAuth"
// instead of the longer context path.
export { useAuth } from "@/context/AuthContext";

import { useMutation } from "@tanstack/react-query";
import { authApi }     from "@/api/auth";

export function useChangePassword() {
  return useMutation({
    mutationFn: (data) => authApi.changePassword(data),
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (data) => authApi.signup(data).then((r) => r.data),
  });
}
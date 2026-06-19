import { Redirect } from "expo-router";

export default function AuthDataRedirect() {
  return <Redirect href="/(tabs)/auth" />;
}

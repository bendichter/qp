const getAppName = (): string => {
  // get the app name from the URL. So for example https://stan-assistant.vercel.app would return "stan-assistant"
  // and http://stan-assistant.localhost:3000 would return "stan-assistant"
  // and https://chat.neurosift.app would return "neurosift-chat"
  // and http://some-domain/?app="stan-assistant" would return "stan-assistant"
  if (typeof window === "undefined") {
    return "unknown-app";
  }
  const urlParams = new URLSearchParams(window.location.search);
  const appParam = urlParams.get("app");
  if (appParam) {
    return appParam;
  }
  if (import.meta.env.VITE_APP_NAME) {
    return import.meta.env.VITE_APP_NAME;
  }
  if (window.location.hostname === "chat.neurosift.app") {
    return "neurosift-chat";
  }
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    return parts[0];
  }
  return "unknown-app";
};

export default getAppName;

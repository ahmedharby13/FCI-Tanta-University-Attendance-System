import axios from "axios";

export const logIn = async (email: string, password: string) => {
  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/login`,
      {
        email,
        password,
      },
    );

    // Save token (if any) to localStorage or cookies
    if (response.data?.token) {
      localStorage.setItem("authToken", response.data.token);
    }

    return { success: true, data: response.data };
  } catch (error) {
    // console.error("Login failed:", error);
    return { success: false, error: error.response?.data || error.message };
  }
};

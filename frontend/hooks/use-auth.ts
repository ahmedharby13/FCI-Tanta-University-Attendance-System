import axios from "axios";
import { toast } from "sonner";

export const useAuth = async () => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/me`);
  if (response.status === 200) {
    // add barear token to local storage
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));

    return true;
  }
  return false;
};
export const registerToAccount = async (
  email: string,
  password: string,
  name: string,
  confirmPassword: string,
  role: "admin" | "instructor" | "student",
  studentId: string,
  department: string
) => {
  let res;
  if (role === "admin" || role === "instructor") {
    res = await axios.post(`${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/register`, {
      email,
      password,
      name,
      role,
      confirmPassword,
      studentId,
    });
    if (res.status === 200) {
      return true;
    }
  }
  if (role === "student") {
    res = await axios.post(`${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/register`, {
      email,
      password,
      name,
      role,
      confirmPassword,
      studentId,
      department,
    });
    if (res.status === 200) {
      return true;
    }
  }

  return false;
};

export const logIn = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/login`, {

        email,
        password,
      }, {
        withCredentials: true,
          headers: {
            "Content-Type": "application/json"
        }
      });
  
      if (response.status === 200) {
        // Store the token and user details in localStorage
        localStorage.setItem("token", response.data.token);
        const userData = await axios.get(`${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/me` ,
          {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
          }
        )

        localStorage.setItem("user", JSON.stringify(userData.data.data.name));
        localStorage.setItem("role", JSON.stringify(userData.data.data.role));
  
        return true;
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Invalid email or password");
      } else {
        toast.error("Invalid Email or Password.")
      }
    }
  
    return false;
  };
export const useLogout = async () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  return true;
};

export const useUpdatePassword = async (currentPassword: string, newPassword: string) => {
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/update-password`,
    {
      currentPassword,
      newPassword,
    },
    
    // add barear token to axios
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );
  if (response.status === 200) {
    return true;
  }
  return false;
};

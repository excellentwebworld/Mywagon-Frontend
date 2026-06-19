import axiosInstance from "../utils/axios";

export const getProfileAPI = async () => {
  try {
    const response = await axiosInstance.get("/me/");
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};

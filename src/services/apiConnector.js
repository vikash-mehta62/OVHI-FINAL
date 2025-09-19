import axios from "axios";

export const axiosInstance = axios.create({});
export const apiConnector = (method, url, bodyData, headers, params) => {
  const config = {
    method: `${method}`,
    url: `${url}`,
    headers: headers ? headers : null,
    params: params ? params : null,
  };

  // Only add data property if bodyData exists and method supports body
  if (bodyData && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    config.data = bodyData;
  }

  return axiosInstance(config);
};

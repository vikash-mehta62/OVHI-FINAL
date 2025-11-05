import {
  showLoadingToast,
  showSuccess,
  showError,
  closeAlert,
} from "../../components/ui/customAlert";
import { apiConnector } from "../apiConnector";
import { APPOINTMENT_API } from "../apis"; // define endpoint paths here

// Create a new appointment
export async function createAppointment(formData, token) {
  showLoadingToast("Creating appointment...");

  try {
    const response = await apiConnector("POST", APPOINTMENT_API.CREATE, formData, {
      Authorization: `Bearer ${token}`,
    });
    console.log("Create appointment response:", response);
    closeAlert();

    if (!response.data.success) throw new Error(response.data.message);

    showSuccess("Success", "Appointment created successfully!",response);
    return response.data;
  } catch (error) {
    closeAlert();
    showError(
      "Error",
      error?.response?.data?.message || "Failed to create appointment."
    );
    throw error; // optional if you want to catch in frontend
  }
}

//resechdule appointment
export async function rescheduleAppointment(appointmentId, formData, token) {
  showLoadingToast("Rescheduling appointment...");
  try {
    const response = await apiConnector(
      "PUT", 
      APPOINTMENT_API.RESCHEDULE(appointmentId),
      formData,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    console.log("Reschedule appointment response:", response);
    closeAlert();

    if (!response.data.success) throw new Error(response.data.message);

    showSuccess("Success", "Appointment rescheduled successfully!",response);
    return response.data;
  } catch (error) {
    closeAlert();
    showError(
      "Error",
      error?.response?.data?.message || "Failed to reschedule appointment."
    );
    throw error; // optional if you want to catch in frontend
  }
}


export async function getAppointmentsByProviderId(providerId, token, date = "") {
  showLoadingToast("Fetching appointments...");

  try {
    const response = await apiConnector(
      "GET",
      APPOINTMENT_API.GET_BY_PROVIDER(providerId) + (date ? `?date=${date}` : ""),
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    closeAlert();

    if (!response.data.success) throw new Error(response.data.message);

    return response.data.data;
  } catch (error) {
    closeAlert();
    showError(
      "Error",
      error?.response?.data?.message || "Failed to fetch appointments."
    );
    return [];
  }
}



export async function getUpcomingAppintmentAPI(providerId, token) {
  showLoadingToast("Fetching appointments...");

  try {
    const response = await apiConnector(
      "GET",
      `${APPOINTMENT_API.UPCOMING_APPOINTMENT}/${providerId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    closeAlert();

    if (!response.data.success) throw new Error(response.data.message);


    return response.data.data;
  } catch (error) {
    closeAlert();
    showError(
      "Error",
      error?.response?.data?.message || "Failed to fetch appointments."
    );
    return [];
  }
}


export async function getSinglePatientAppintmentApi(patientId, token) {
  showLoadingToast("Fetching appointments...");

  try {
    const response = await apiConnector(
      "GET",
      `${APPOINTMENT_API.SINGLE_PATINET_APPOINTMENT}/${patientId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    closeAlert();

    if (!response.data.success) throw new Error(response.data.message);


    return response.data.data;
  } catch (error) {
    closeAlert();
    showError(
      "Error",
      error?.response?.data?.message || "Failed to fetch single patient appointments."
    );
    return [];
  }
}

// Cancel appointment
export async function cancelAppointment(appointmentId, token) {
  showLoadingToast("Cancelling appointment...");

  try {
    const response = await apiConnector(
      "DELETE",
      APPOINTMENT_API.DELETE(appointmentId),
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    closeAlert();

    if (!response.data.success) throw new Error(response.data.message);

    showSuccess("Success", "Appointment cancelled successfully!", response);
    return response.data;
  } catch (error) {
    closeAlert();
    showError(
      "Error",
      error?.response?.data?.message || "Failed to cancel appointment."
    );
    throw error;
  }
}
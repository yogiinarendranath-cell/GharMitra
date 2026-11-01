import * as signalR from "@microsoft/signalr";
import { tokenKey } from "./api";

let connection: signalR.HubConnection | null = null;

export function connectBookingHub(onEvent: (method: string, payload: any) => void): signalR.HubConnection {
    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) return connection;

    connection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5080/hubs/booking", {
            accessTokenFactory: () => localStorage.getItem(tokenKey) ?? "",
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

    for (const m of ["BookingCreated", "BookingAssigned", "BookingAccepted", "BookingCancelled"]) {
        connection.on(m, (payload) => onEvent(m, payload));
    }

    connection.start().catch(err => console.error("SignalR connect failed:", err));
    return connection;
}

export function disconnectBookingHub() {
    if (connection) {
        connection.stop().catch(() => {});
        connection = null;
    }
}
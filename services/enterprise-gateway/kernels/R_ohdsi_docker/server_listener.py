"""A server listener for R."""

import base64
import json
import os
import random
import socket
import uuid
from datetime import datetime
from threading import Thread

from Cryptodome.Cipher import AES, PKCS1_v1_5
from Cryptodome.PublicKey import RSA
from Cryptodome.Random import get_random_bytes
from Cryptodome.Util.Padding import pad
from jupyter_client.connect import write_connection_file

LAUNCHER_VERSION = 1  # Indicate to server the version of this launcher (payloads may vary)

max_port_range_retries = int(
    os.getenv("MAX_PORT_RANGE_RETRIES", os.getenv("EG_MAX_PORT_RANGE_RETRIES", "5"))
)

log_level = os.getenv("LOG_LEVEL", os.getenv("EG_LOG_LEVEL", "10"))

print(f"[INFO] === server_listener.py script starting ===")
print(f"[INFO] Log level set to: {log_level}")
print(f"[INFO] Max port range retries: {max_port_range_retries}")

def _ensure_bytes(s, encoding="utf-8"):
    """Ensure argument is bytes for cryptographic operations."""
    print(f"[DEBUG] _ensure_bytes: START - type={type(s)}")
    if isinstance(s, bytes):
        print("[DEBUG] _ensure_bytes: END - already bytes")
        return s
    elif isinstance(s, str):
        result = s.encode(encoding)
        print(f"[DEBUG] _ensure_bytes: END - encoded string to bytes, length={len(result)}")
        return result
    elif hasattr(s, "decode"):
        # Maybe memoryview, bytearray, etc.
        result = bytes(s)
        print(f"[DEBUG] _ensure_bytes: END - converted to bytes, length={len(result)}")
        return result
    print(f"[ERROR] _ensure_bytes: END - TypeError for type {type(s)}")
    raise TypeError(f"Cannot convert type {type(s)} to bytes")

def _encrypt(connection_info_str, public_key):
    """Encrypt the connection information using a generated AES key that is then encrypted using
    the public key passed from the server.  Both are then returned in an encoded JSON payload.

    This code also exists in the Python kernel-launcher's launch_ipykernel.py script.
    """
    print("[INFO] _encrypt: START")
    print(f"[DEBUG] _encrypt: connection_info length={len(connection_info_str)}")
    
    aes_key = get_random_bytes(16)
    cipher = AES.new(aes_key, mode=AES.MODE_ECB)

    # Encrypt the connection info using the aes_key, must be bytes
    connection_bytes = _ensure_bytes(connection_info_str)
    encrypted_connection_info = cipher.encrypt(pad(connection_bytes, 16))
    b64_connection_info = base64.b64encode(encrypted_connection_info)

    # Encrypt the aes_key using the server's public key
    imported_public_key = RSA.importKey(base64.b64decode(_ensure_bytes(public_key)))
    cipher_rsa = PKCS1_v1_5.new(key=imported_public_key)
    encrypted_key = base64.b64encode(cipher_rsa.encrypt(aes_key))

    # Compose the payload and Base64 encode it
    payload = {
        "version": LAUNCHER_VERSION,
        "key": encrypted_key.decode(),
        "conn_info": b64_connection_info.decode(),
    }
    # Note: json.dumps() produces str, encode to bytes
    b64_payload = base64.b64encode(json.dumps(payload).encode("utf-8"))
    print(f"[INFO] _encrypt: END - payload length={len(b64_payload)}")
    return b64_payload

def return_connection_info(
    connection_file, response_addr, lower_port, upper_port, kernel_id, public_key, parent_pid
):
    """Returns the connection information corresponding to this kernel.

    This code also exists in the Python kernel-launcher's launch_ipykernel.py script.
    """
    print(f"[INFO] return_connection_info: START - response_addr={response_addr}, kernel_id={kernel_id}")
    
    response_parts = response_addr.split(":")
    if len(response_parts) != 2:
        print(
            f"[ERROR] Invalid format for response address '{response_addr}'. Assuming 'pull' mode..."
        )
        print("[INFO] return_connection_info: END - invalid format")
        return

    response_ip = response_parts[0]
    try:
        response_port = int(response_parts[1])
    except ValueError:
        print(
            f"[ERROR] Invalid port component found in response address '{response_addr}'. "
            "Assuming 'pull' mode..."
        )
        print("[INFO] return_connection_info: END - invalid port")
        return

    with open(connection_file) as fp:
        cf_json = json.load(fp)

    # add process and process group ids into connection info
    cf_json["pid"] = parent_pid
    cf_json["pgid"] = os.getpgid(parent_pid)

    # prepare socket address for handling signals
    comm_sock = prepare_comm_socket(lower_port, upper_port)
    cf_json["comm_port"] = comm_sock.getsockname()[1]
    cf_json["kernel_id"] = kernel_id

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((response_ip, response_port))
        json_content = json.dumps(cf_json).encode("utf-8")
        print(f"[DEBUG] JSON Payload '{json_content}'")
        payload = _encrypt(json_content, public_key)
        print(f"[DEBUG] Encrypted Payload '{payload}'")
        s.send(payload)

    print(f"[INFO] return_connection_info: END - comm_port={cf_json['comm_port']}")
    return comm_sock

def prepare_comm_socket(lower_port, upper_port):
    """Prepares the socket to which the server will send signal and shutdown requests.

    This code also exists in the Python kernel-launcher's launch_ipykernel.py script.
    """
    print(f"[INFO] prepare_comm_socket: START - port range={lower_port}..{upper_port}")
    sock = _select_socket(lower_port, upper_port)
    print(
        f"[INFO] Signal socket bound to host: {sock.getsockname()[0]}, port: {sock.getsockname()[1]}"
    )
    sock.listen(1)
    sock.settimeout(5)
    print(f"[INFO] prepare_comm_socket: END - listening on port {sock.getsockname()[1]}")
    return sock

def _select_ports(count, lower_port, upper_port):
    """Select and return n random ports that are available and adhere to the given port range, if applicable.

    This code also exists in the Python kernel-launcher's launch_ipykernel.py script.
    """
    print(f"[INFO] _select_ports: START - count={count}, range={lower_port}..{upper_port}")
    ports = []
    sockets = []
    for _ in range(count):
        sock = _select_socket(lower_port, upper_port)
        ports.append(sock.getsockname()[1])
        sockets.append(sock)
    for sock in sockets:
        sock.close()
    print(f"[INFO] _select_ports: END - selected ports={ports}")
    return ports

def _select_socket(lower_port, upper_port):
    """Create and return a socket whose port is available and adheres to the given port range, if applicable.

    This code also exists in the Python kernel-launcher's launch_ipykernel.py script.
    """
    print(f"[DEBUG] _select_socket: START - range={lower_port}..{upper_port}")
    retries = 0
    while True:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            port = _get_candidate_port(lower_port, upper_port)
            sock.bind(("0.0.0.0", port))
            print(f"[DEBUG] _select_socket: END - successfully bound to port {sock.getsockname()[1]}")
            return sock  # Only return sock if bind succeeds
        except Exception:
            sock.close()
            retries += 1
            print(f"[DEBUG] _select_socket: retry {retries}/{max_port_range_retries}")
            if retries > max_port_range_retries:
                msg = f"Failed to locate port within range {lower_port}..{upper_port} after {max_port_range_retries} retries!"
                print(f"[ERROR] _select_socket: END - {msg}")
                raise RuntimeError(msg) from None

def _get_candidate_port(lower_port, upper_port):
    """Returns a port within the given range.  If the range is zero, the zero is returned.

    This code also exists in the Python kernel-launcher's launch_ipykernel.py script.
    """
    range_size = upper_port - lower_port
    if range_size == 0:
        print("[DEBUG] _get_candidate_port: returning 0 (auto-assign)")
        return 0
    port = random.randint(lower_port, upper_port)
    print(f"[DEBUG] _get_candidate_port: returning {port}")
    return port

def get_server_request(sock):
    """Gets a request from the server and returns the corresponding dictionary.

    This code also exists in the Python kernel-launcher's launch_ipykernel.py script.
    """
    print("[DEBUG] get_server_request: START - waiting for request")
    conn = None
    data = ""
    request_info = None
    try:
        conn, addr = sock.accept()
        print(f"[DEBUG] get_server_request: connection accepted from {addr}")
        while True:
            buffer = conn.recv(1024)
            if not buffer:
                break
            data += buffer.decode("utf-8")
        if data:
            request_info = json.loads(data)
            print(f"[DEBUG] get_server_request: received request={request_info}")
    except Exception as e:
        # socket.timeout and other exceptions should be handled gracefully
        import errno
        if isinstance(e, socket.timeout) or (
            hasattr(e, 'errno') and e.errno == errno.EWOULDBLOCK
        ):
            print("[DEBUG] get_server_request: timeout or would block")
        else:
            print(f"[ERROR] get_server_request: exception - {e}")
            raise e
    finally:
        if conn:
            conn.close()

    print(f"[DEBUG] get_server_request: END - request_info={request_info}")
    return request_info

def server_listener(sock, parent_pid):
    """Waits for requests from the server and processes each when received.  Currently,
    these will be one of a sending a signal to the corresponding kernel process (signum) or
    stopping the listener and exiting the kernel (shutdown).

     This code also exists in the Python kernel-launcher's launch_ipykernel.py script.
    """
    print(f"[INFO] server_listener: START - parent_pid={parent_pid}")
    shutdown = False
    while not shutdown:
        request = get_server_request(sock)
        if request:
            signum = -1  # prevent logging poll requests since that occurs every 3 seconds
            if request.get("signum") is not None:
                try:
                    signum = int(request.get("signum"))
                    os.kill(parent_pid, signum)
                    print(f"[DEBUG] server_listener: sent signal {signum} to pid {parent_pid}")
                except Exception as e:
                    print(f"[ERROR] Exception sending signal: {e}")
            if request.get("shutdown") is not None:
                shutdown = bool(request.get("shutdown"))
                if shutdown:
                    print("[INFO] server_listener: shutdown request received")
            if signum != 0:
                print(f"[INFO] server_listener got request: {request}")
    print("[INFO] server_listener: END - shutdown complete")

def setup_server_listener(
    conn_filename, parent_pid, lower_port, upper_port, response_addr, kernel_id, public_key
):
    """Set up the server listener."""
    print(f"[INFO] setup_server_listener: START - kernel_id={kernel_id}, parent_pid={parent_pid}")
    print(f"[INFO] setup_server_listener: port range={lower_port}..{upper_port}")
    
    ip = "0.0.0.0"  # noqa
    key = str(uuid.uuid4()).encode("utf-8")  # convert to bytes

    ports = _select_ports(5, lower_port, upper_port)
    print(f"[INFO] setup_server_listener: selected ports - shell={ports[0]}, iopub={ports[1]}, stdin={ports[2]}, hb={ports[3]}, control={ports[4]}")

    write_connection_file(
        fname=conn_filename,
        ip=ip,
        key=key,
        shell_port=ports[0],
        iopub_port=ports[1],
        stdin_port=ports[2],
        hb_port=ports[3],
        control_port=ports[4],
    )
    print(f"[INFO] setup_server_listener: connection file written to {conn_filename}")
    
    if response_addr:
        print(f"[INFO] setup_server_listener: returning connection info to {response_addr}")
        comm_socket = return_connection_info(
            conn_filename,
            response_addr,
            int(lower_port),
            int(upper_port),
            kernel_id,
            public_key,
            int(parent_pid),
        )
        if comm_socket:  # socket in use, start server listener thread
            print("[INFO] setup_server_listener: starting server listener thread")
            server_listener_thread = Thread(
                target=server_listener,
                args=(
                    comm_socket,
                    int(parent_pid),
                ),
                daemon=True,
            )
            server_listener_thread.start()
            print("[INFO] setup_server_listener: server listener thread started")
    else:
        print("[INFO] setup_server_listener: no response_addr provided, skipping connection info return")

    print("[INFO] setup_server_listener: END")
    return

__all__ = [
    "setup_server_listener",
]

print("[INFO] === server_listener.py script initialization complete ===")

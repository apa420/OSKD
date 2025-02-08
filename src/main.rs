use axum::{response::Html, routing::get, Server};
use input::{
    event::{
        keyboard::{KeyState, KeyboardEventTrait},
        Event::Keyboard,
        KeyboardEvent::Key,
    },
    Libinput, LibinputInterface,
};
use key_names::physical_key_name;
use libc::{O_RDONLY, O_RDWR, O_WRONLY};
use socketio_server::{
    config::SocketIoConfig, layer::SocketIoLayer, ns::Namespace, socket::Socket,
};
use std::fs::{File, OpenOptions};
use std::os::unix::{fs::OpenOptionsExt, io::OwnedFd};
use std::{
    env, fs,
    path::Path,
    sync::{Arc, Mutex},
    time::Duration,
};
use winit::keyboard::{NativeKeyCode, PhysicalKey};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting application...");

    // Create client list.
    let clients = Arc::new(Mutex::new(Vec::<Arc<Socket>>::new()));
    let clients_clone = clients.clone();

    // Create Socket.IO server.
    let config = SocketIoConfig::builder()
        .ping_interval(Duration::from_secs(5))
        .ping_timeout(Duration::from_secs(5))
        .max_payload(1e6 as u64)
        .build();

    let ns_handler = Namespace::builder()
        .add("/", move |socket| {
            let clients = clients_clone.clone();
            async move {
                clients.lock().unwrap().push(socket.clone());
            }
        })
        .build();

    // Listen keyboard.
    let callback = move |event: &mut input::Event| {
        if let Keyboard(Key(eventk)) = event {
            let name =
                physical_key_name(PhysicalKey::Unidentified(NativeKeyCode::Xkb(eventk.key())));
            match eventk.key_state() {
                KeyState::Pressed => {
                    let output = name + " 1";
                    let clients_lock = clients.lock().unwrap();
                    for socket in clients_lock.iter() {
                        socket.emit("input", output.clone()).unwrap();
                    }
                }
                KeyState::Released => {
                    let output = name + " 0";
                    let clients_lock = clients.lock().unwrap();
                    for socket in clients_lock.iter() {
                        socket.emit("input", output.clone()).unwrap();
                    }
                }
            }
        }
    };

    // Create HTTP service.
    let app = axum::Router::new()
        .route(
            "/",
            get(move || async {
                let html = include_str!("../public/index.html");
                //Response::new(Body::from(html))
                Html(html)
            }),
        )
        .route(
            "/app.js",
            get(move || async {
                let js = include_str!("../public/app.js");
                js
            }),
        )
        .route(
            "/socket-io.js",
            get(move || async {
                let js = include_str!("../public/socket-io.js");
                js
            }),
        )
        .route(
            "/config.json",
            get(move || async {
                // Load configuration.
                let config_file = env::current_dir().unwrap().join("config.json");

                if config_file.exists() {
                    return fs::read_to_string(config_file).unwrap();
                } else {
                    let config = include_str!("../public/default_config.json").to_string();
                    fs::write(config_file, config.clone()).unwrap();
                    return config;
                }
            }),
        )
        .layer(SocketIoLayer::from_config(config, ns_handler));

    tokio::task::spawn(async move {
        let addr = "127.0.0.1:41770";
        println!("Listening widget on http://{}/", addr);

        Server::bind(&addr.parse().unwrap())
            .serve(app.into_make_service())
            .await
            .unwrap();
    });
    struct Interface;

    impl LibinputInterface for Interface {
        fn open_restricted(&mut self, path: &Path, flags: i32) -> Result<OwnedFd, i32> {
            OpenOptions::new()
                .custom_flags(flags)
                .read((flags & O_RDONLY != 0) | (flags & O_RDWR != 0))
                .write((flags & O_WRONLY != 0) | (flags & O_RDWR != 0))
                .open(path)
                .map(|file| file.into())
                .map_err(|err| err.raw_os_error().unwrap())
        }
        fn close_restricted(&mut self, fd: OwnedFd) {
            drop(File::from(fd));
        }
    }

    let mut input = Libinput::new_with_udev(Interface);
    input.udev_assign_seat("seat0").unwrap();
    println!("Listening for keyboard input");
    loop {
        input.dispatch().unwrap();
        for mut event in &mut input {
            callback(&mut event);
        }
    }
}

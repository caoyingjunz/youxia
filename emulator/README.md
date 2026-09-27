# RetroArch integration notes (游侠)

## Local play

```
retroarch -L <cores_dir>/fbneo_libretro.dll <roms_dir>/<rom>.zip
```

macOS/Linux cores use `.dylib` / `.so`.

## Netplay

Host:

```
retroarch -L <core> <rom> --host --port 55435
```

Guest:

```
retroarch -L <core> <rom> --connect <host_ip> --port 55435
```

客户端在匹配成功后由主进程拼装上述参数；USB 街机杆由 RetroArch 直接读取。
Windows 优先 XInput/DInput；macOS 走 HID（个别摇杆可能需要额外驱动）。

## Config template

见 `retroarch-youxia.cfg`：开启自动手柄检测、全屏可选、禁用硬核存档。

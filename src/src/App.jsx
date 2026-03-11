import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── DATA ────────────────────────────────────────────────────────────────────
const SUCURSALES = [
  { id: 1, nombre: "Polanco",     usuario: "polanco",     password: "cire2026", color: "#2721E8" },
  { id: 2, nombre: "Santa Fe",    usuario: "santafe",     password: "cire2026", color: "#49B8D3" },
  { id: 3, nombre: "Coyoacán",    usuario: "coyoacan",    password: "cire2026", color: "#2721E8" },
  { id: 4, nombre: "Insurgentes", usuario: "insurgentes", password: "cire2026", color: "#49B8D3" },
  { id: 5, nombre: "Satélite",    usuario: "satelite",    password: "cire2026", color: "#2721E8" },
];

const SERVICIOS = [
  { id: "s1",  nombre: "Axilas",             precio: 980,  zona: "Superior" },
  { id: "s2",  nombre: "Bikini brasileño",   precio: 1850, zona: "Zona íntima" },
  { id: "s3",  nombre: "Bikini completo",    precio: 2200, zona: "Zona íntima" },
  { id: "s4",  nombre: "Piernas completas",  precio: 2600, zona: "Inferior" },
  { id: "s5",  nombre: "Piernas medias",     precio: 1600, zona: "Inferior" },
  { id: "s6",  nombre: "Rostro completo",    precio: 2200, zona: "Cara" },
  { id: "s7",  nombre: "Bozo",               precio: 680,  zona: "Cara" },
  { id: "s8",  nombre: "Espalda alta",       precio: 1850, zona: "Superior" },
  { id: "s9",  nombre: "Espalda completa",   precio: 2800, zona: "Superior" },
  { id: "s10", nombre: "Brazos completos",   precio: 2100, zona: "Superior" },
  { id: "s11", nombre: "Abdomen",            precio: 1200, zona: "Superior" },
  { id: "s12", nombre: "Glúteos",            precio: 1500, zona: "Inferior" },
  { id: "s13", nombre: "Paquete Básico",     precio: 3800, zona: "Paquetes", espack: true },
  { id: "s14", nombre: "Paquete Premium",    precio: 6200, zona: "Paquetes", espack: true },
  { id: "s15", nombre: "Paquete Full Body",  precio: 9800, zona: "Paquetes", espack: true },
];

const ZONAS   = ["Todos", "Superior", "Inferior", "Cara", "Zona íntima", "Paquetes"];
const METODOS = ["Efectivo", "Tarjeta débito", "Tarjeta crédito", "Transferencia", "Código QR"];
const SESIONES = ["1ª sesión", "2ª sesión", "3ª sesión", "4ª sesión", "5ª sesión", "6ª sesión"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt   = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(n);
const horaActual  = () => new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
const fechaActual = () => new Date().toISOString().slice(0, 10);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function CirePOS() {
  const [session, setSession]         = useState(null);
  const [loginUser, setLoginUser]     = useState("");
  const [loginPass, setLoginPass]     = useState("");
  const [loginErr, setLoginErr]       = useState("");
  const [view, setView]               = useState("pos");
  const [zona, setZona]               = useState("Todos");
  const [tickets, setTickets]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);

  // Ticket en construcción
  const [clienta, setClienta]         = useState("");
  const [tipoClienta, setTipoClienta] = useState("Nueva");
  const [selectedSvcs, setSelectedSvcs] = useState([]);
  const [metodo, setMetodo]           = useState("Tarjeta crédito");
  const [sesion, setSesion]           = useState("1ª sesión");
  const [descuento, setDescuento]     = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastTicket, setLastTicket]   = useState(null);

  const total         = selectedSvcs.reduce((s, id) => s + (SERVICIOS.find((x) => x.id === id)?.precio || 0), 0);
  const totalConDesc  = total * (1 - descuento / 100);

  // ─── CARGAR TICKETS DE SUPABASE ──────────────────────────────────────────
  const cargarTickets = async (sucId) => {
    setLoading(true);
    const hoy = fechaActual();
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("sucursal_id", sucId)
      .eq("fecha", hoy)
      .order("created_at", { ascending: false });
    if (!error && data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => {
    if (session) cargarTickets(session.id);
  }, [session]);

  // ─── LOGIN ───────────────────────────────────────────────────────────────
  const handleLogin = () => {
    const suc = SUCURSALES.find(
      (s) => s.usuario === loginUser.trim().toLowerCase() && s.password === loginPass
    );
    if (suc) { setSession(suc); setLoginErr(""); }
    else setLoginErr("Usuario o contraseña incorrectos");
  };

  const logout = () => {
    setSession(null); setLoginUser(""); setLoginPass("");
    setTickets([]); resetForm();
  };

  const resetForm = () => {
    setClienta(""); setTipoClienta("Nueva"); setSelectedSvcs([]);
    setMetodo("Tarjeta crédito"); setSesion("1ª sesión"); setDescuento(0);
    setShowConfirm(false);
  };

  // ─── CERRAR TICKET ────────────────────────────────────────────────────────
  const cerrarTicket = async () => {
    setSaving(true);
    const ticketNum = `T-${Date.now().toString().slice(-4)}`;
    const nuevoTicket = {
      ticket_num:      ticketNum,
      sucursal_id:     session.id,
      sucursal_nombre: session.nombre,
      clienta:         clienta || "Sin nombre",
      tipo_clienta:    tipoClienta,
      servicios:       selectedSvcs.map((id) => SERVICIOS.find((s) => s.id === id)?.nombre),
      sesion,
      metodo_pago:     metodo,
      subtotal:        total,
      descuento,
      total:           totalConDesc,
      fecha:           fechaActual(),
      hora:            horaActual(),
    };

    const { data, error } = await supabase.from("tickets").insert([nuevoTicket]).select();
    if (!error && data) {
      setLastTicket({ ...nuevoTicket, id: data[0].id });
      setTickets((prev) => [data[0], ...prev]);
    }
    setSaving(false);
    setShowConfirm(false);
    resetForm();
  };

  const toggleSvc = (id) =>
    setSelectedSvcs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const filtrados  = zona === "Todos" ? SERVICIOS : SERVICIOS.filter((s) => s.zona === zona);
  const hoyVentas  = tickets.reduce((s, t) => s + Number(t.total), 0);
  const hoyNuevas  = tickets.filter((t) => t.tipo_clienta === "Nueva").length;

  // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
  if (!session) return (
    <div style={{ minHeight: "100vh", background: "#0C0D1A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Albert Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .glow { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
        .btn-primary { background: #2721E8; color: #fff; border: none; border-radius: 12px; padding: 14px 0; width: 100%; font-family: 'Albert Sans', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { background: #3d38f0; transform: translateY(-1px); box-shadow: 0 8px 30px #2721E844; }
        .input-field { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px 16px; color: #fff; font-family: 'Albert Sans', sans-serif; font-size: 14px; width: 100%; outline: none; transition: border 0.2s; }
        .input-field:focus { border-color: #2721E8; background: rgba(39,33,232,0.1); }
        .input-field::placeholder { color: rgba(255,255,255,0.25); }
        .suc-pill { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.15s; }
        .suc-pill:hover { border-color: #2721E8; color: #fff; }
      `}</style>
      <div className="glow" style={{ width: 400, height: 400, background: "#2721E8", opacity: 0.15, top: "-100px", left: "-100px" }} />
      <div className="glow" style={{ width: 300, height: 300, background: "#49B8D3", opacity: 0.1, bottom: "50px", right: "50px" }} />
      <div className="glass" style={{ width: 420, padding: "48px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#49B8D3", marginBottom: "8px", fontWeight: 500 }}>SISTEMA INTERNO</div>
          <div style={{ fontSize: "38px", fontWeight: 700, color: "#fff", letterSpacing: "6px" }}>CIRE</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "4px", fontWeight: 300 }}>Punto de Venta · Recepción</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", letterSpacing: "1px" }}>SUCURSAL / USUARIO</div>
            <input className="input-field" placeholder="ej. polanco" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", letterSpacing: "1px" }}>CONTRASEÑA</div>
            <input className="input-field" type="password" placeholder="••••••••" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          {loginErr && <div style={{ color: "#ff6b6b", fontSize: "13px", textAlign: "center" }}>{loginErr}</div>}
        </div>
        <button className="btn-primary" onClick={handleLogin}>Iniciar sesión →</button>
        <div style={{ marginTop: "28px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginBottom: "12px", letterSpacing: "1px", textAlign: "center" }}>ACCESOS DISPONIBLES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
            {SUCURSALES.map((s) => (
              <div key={s.id} className="suc-pill" onClick={() => setLoginUser(s.usuario)}>{s.nombre}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── APP SCREEN ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0C0D1A", fontFamily: "'Albert Sans', sans-serif", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
        .glass-dark { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
        .btn-blue { background: #2721E8; color: #fff; border: none; border-radius: 10px; padding: 11px 20px; font-family: 'Albert Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-blue:hover { background: #3d38f0; }
        .btn-blue:disabled { background: rgba(39,33,232,0.3); cursor: default; }
        .btn-ghost { background: transparent; color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 9px 16px; font-family: 'Albert Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #2721E8; color: #fff; }
        .btn-ghost.active { border-color: #2721E8; color: #2721E8; background: rgba(39,33,232,0.1); }
        .svc-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.18s; }
        .svc-card:hover { border-color: rgba(39,33,232,0.5); background: rgba(39,33,232,0.08); }
        .svc-card.selected { border-color: #2721E8; background: rgba(39,33,232,0.15); }
        .svc-card.pack { border-color: rgba(73,184,211,0.3); }
        .svc-card.pack.selected { border-color: #49B8D3; background: rgba(73,184,211,0.12); }
        .input-sm { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; color: #fff; font-family: 'Albert Sans', sans-serif; font-size: 13px; width: 100%; outline: none; transition: border 0.2s; }
        .input-sm:focus { border-color: #2721E8; }
        .input-sm::placeholder { color: rgba(255,255,255,0.2); }
        .tipo-btn { flex: 1; padding: 9px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.18s; border: 1px solid transparent; text-align: center; }
        .badge-nueva { background: rgba(39,33,232,0.2); color: #6b66ff; border: 1px solid rgba(39,33,232,0.4); border-radius: 6px; padding: 2px 10px; font-size: 11px; font-weight: 600; }
        .badge-rec { background: rgba(73,184,211,0.15); color: #49B8D3; border: 1px solid rgba(73,184,211,0.3); border-radius: 6px; padding: 2px 10px; font-size: 11px; font-weight: 600; }
        .nav-tab { padding: 10px 20px; font-size: 13px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; color: rgba(255,255,255,0.35); transition: all 0.18s; }
        .nav-tab.active { color: #fff; border-bottom-color: #2721E8; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .select-sm { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; color: #fff; font-family: 'Albert Sans', sans-serif; font-size: 13px; width: 100%; outline: none; cursor: pointer; }
        select option { background: #161728; }
        .ticket-row { display: grid; grid-template-columns: 90px 1fr 120px 110px 90px; gap: 0; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
        .ticket-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>

      {/* TOPBAR */}
      <div style={{ padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "4px" }}>CIRE</div>
          <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: session.color, boxShadow: `0 0 8px ${session.color}` }} />
            <span style={{ fontSize: "14px", fontWeight: 500 }}>{session.nombre}</span>
          </div>
          <div style={{ display: "flex" }}>
            {["pos", "historial"].map((v) => (
              <div key={v} className={`nav-tab ${view === v ? "active" : ""}`} onClick={() => { setView(v); if (v === "historial") cargarTickets(session.id); }}>
                {v === "pos" ? "Punto de Venta" : "Historial de Hoy"}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px" }}>HOY</div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#49B8D3" }}>{fmt(hoyVentas)}</div>
          </div>
          <button className="btn-ghost" onClick={logout} style={{ fontSize: "12px" }}>Cerrar sesión</button>
        </div>
      </div>

      {/* TOAST ÚLTIMO TICKET */}
      {lastTicket && (
        <div style={{ background: "rgba(39,33,232,0.15)", border: "1px solid rgba(39,33,232,0.4)", margin: "16px 24px 0", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "20px" }}>✓</div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Ticket {lastTicket.ticket_num} guardado en base de datos</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{lastTicket.clienta} · {fmt(lastTicket.total)} · {lastTicket.metodo_pago}</div>
            </div>
          </div>
          <button onClick={() => setLastTicket(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
      )}

      {view === "pos" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", flex: 1, overflow: "hidden", height: "calc(100vh - 64px)" }}>

          {/* SERVICIOS */}
          <div style={{ padding: "20px 20px 20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {ZONAS.map((z) => (
                <button key={z} className={`btn-ghost ${zona === z ? "active" : ""}`} onClick={() => setZona(z)} style={{ padding: "7px 14px", fontSize: "12px" }}>{z}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {filtrados.map((s) => (
                <div key={s.id} className={`svc-card ${selectedSvcs.includes(s.id) ? "selected" : ""} ${s.espack ? "pack" : ""}`} onClick={() => toggleSvc(s.id)}>
                  <div style={{ fontSize: "11px", color: s.espack ? "#49B8D3" : "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "6px", fontWeight: 500 }}>{s.zona.toUpperCase()}</div>
                  <div style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.3, marginBottom: "10px" }}>{s.nombre}</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: s.espack ? "#49B8D3" : "#2721E8" }}>{fmt(s.precio)}</div>
                  {selectedSvcs.includes(s.id) && <div style={{ marginTop: "8px", fontSize: "11px", color: "#6b66ff", fontWeight: 600 }}>✓ SELECCIONADO</div>}
                </div>
              ))}
            </div>
          </div>

          {/* PANEL TICKET */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", padding: "20px", overflowY: "auto", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "1px", color: "rgba(255,255,255,0.4)" }}>NUEVO TICKET</div>

            <div className="glass-dark" style={{ padding: "16px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "10px" }}>DATOS DE CLIENTA</div>
              <input className="input-sm" placeholder="Nombre de la clienta" value={clienta} onChange={(e) => setClienta(e.target.value)} style={{ marginBottom: "10px" }} />
              <div style={{ display: "flex", gap: "6px" }}>
                {["Nueva", "Recurrente"].map((t) => (
                  <div key={t} className="tipo-btn" onClick={() => setTipoClienta(t)}
                    style={{
                      background: tipoClienta === t ? (t === "Nueva" ? "rgba(39,33,232,0.25)" : "rgba(73,184,211,0.2)") : "rgba(255,255,255,0.03)",
                      color: tipoClienta === t ? (t === "Nueva" ? "#6b66ff" : "#49B8D3") : "rgba(255,255,255,0.35)",
                      borderColor: tipoClienta === t ? (t === "Nueva" ? "#2721E8" : "#49B8D3") : "rgba(255,255,255,0.08)",
                    }}>
                    {t === "Nueva" ? "⭐ Nueva" : "↩ Recurrente"}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-dark" style={{ padding: "16px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "8px" }}>SESIÓN</div>
              <select className="select-sm" value={sesion} onChange={(e) => setSesion(e.target.value)}>
                {SESIONES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="glass-dark" style={{ padding: "16px", flex: 1 }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "12px" }}>SERVICIOS</div>
              {selectedSvcs.length === 0
                ? <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "20px 0" }}>Selecciona del menú</div>
                : selectedSvcs.map((id) => {
                  const s = SERVICIOS.find((x) => x.id === id);
                  return (
                    <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "13px" }}>{s.nombre}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ fontSize: "13px", color: "#49B8D3", fontWeight: 600 }}>{fmt(s.precio)}</div>
                        <div onClick={() => toggleSvc(id)} style={{ cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: "16px" }}>×</div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="glass-dark" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "8px" }}>MÉTODO DE PAGO</div>
                <select className="select-sm" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  {METODOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "8px" }}>DESCUENTO %</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[0, 5, 10, 15, 20].map((d) => (
                    <div key={d} onClick={() => setDescuento(d)} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                      background: descuento === d ? "rgba(39,33,232,0.25)" : "rgba(255,255,255,0.03)",
                      borderColor: descuento === d ? "#2721E8" : "rgba(255,255,255,0.08)",
                      color: descuento === d ? "#6b66ff" : "rgba(255,255,255,0.4)" }}>
                      {d === 0 ? "—" : `${d}%`}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: "16px", background: "rgba(39,33,232,0.12)", border: "1px solid rgba(39,33,232,0.3)", borderRadius: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>
                <span>Subtotal</span><span>{fmt(total)}</span>
              </div>
              {descuento > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#ff8a65", marginBottom: "6px" }}>
                  <span>Descuento {descuento}%</span><span>-{fmt(total * descuento / 100)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", fontWeight: 700, marginTop: "8px" }}>
                <span>TOTAL</span><span style={{ color: "#49B8D3" }}>{fmt(totalConDesc)}</span>
              </div>
            </div>

            <button className="btn-blue" disabled={selectedSvcs.length === 0 || saving} onClick={() => setShowConfirm(true)} style={{ width: "100%", padding: "14px", fontSize: "15px", borderRadius: "12px" }}>
              {saving ? "Guardando..." : "Cerrar ticket →"}
            </button>
          </div>
        </div>
      ) : (
        /* HISTORIAL */
        <div style={{ padding: "24px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "24px" }}>
            {[
              { l: "Ventas de hoy", v: fmt(hoyVentas), c: "#49B8D3" },
              { l: "Tickets cerrados", v: tickets.length, c: "#fff" },
              { l: "Nuevas clientas", v: hoyNuevas, c: "#6b66ff" },
            ].map((k) => (
              <div key={k.l} className="glass" style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "8px" }}>{k.l.toUpperCase()}</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>
          <div className="glass" style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "13px", fontWeight: 600 }}>
              Tickets del día — {session.nombre}
              {loading && <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "12px" }}>Cargando...</span>}
            </div>
            <div className="ticket-row" style={{ padding: "10px 16px" }}>
              {["TICKET", "CLIENTA / SERVICIOS", "TOTAL", "MÉTODO", "TIPO"].map((h) => (
                <div key={h} style={{ fontSize: "10px", letterSpacing: "1.5px", color: "rgba(255,255,255,0.25)" }}>{h}</div>
              ))}
            </div>
            {tickets.length === 0
              ? <div style={{ padding: "32px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
                  {loading ? "Cargando tickets..." : "No hay tickets registrados hoy"}
                </div>
              : tickets.map((t) => (
                <div key={t.id} className="ticket-row">
                  <div style={{ fontSize: "12px", color: "#6b66ff", fontWeight: 600 }}>{t.ticket_num}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{t.clienta}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{(t.servicios || []).join(" + ")}</div>
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#49B8D3" }}>{fmt(t.total)}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{t.metodo_pago}</div>
                  <div><span className={t.tipo_clienta === "Nueva" ? "badge-nueva" : "badge-rec"}>{t.tipo_clienta}</span></div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR */}
      {showConfirm && (
        <div className="overlay">
          <div className="glass" style={{ width: 420, padding: "32px", borderColor: "rgba(39,33,232,0.4)" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#6b66ff", marginBottom: "8px" }}>CONFIRMAR TICKET</div>
            <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "20px" }}>¿Cerrar venta?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Clienta</span>
                <span style={{ fontWeight: 500 }}>{clienta || "Sin nombre"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Tipo</span>
                <span className={tipoClienta === "Nueva" ? "badge-nueva" : "badge-rec"}>{tipoClienta}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Servicios</span>
                <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "200px" }}>{selectedSvcs.map((id) => SERVICIOS.find((s) => s.id === id)?.nombre).join(", ")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Sesión</span><span>{sesion}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Método</span><span>{metodo}</span>
              </div>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: "#49B8D3" }}>{fmt(totalConDesc)}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn-ghost" onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "13px" }}>Cancelar</button>
              <button className="btn-blue" onClick={cerrarTicket} disabled={saving} style={{ flex: 2, padding: "13px", fontSize: "15px" }}>
                {saving ? "Guardando..." : "✓ Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

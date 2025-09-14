// convertClient.js
// Lógica de la calculadora de bases — versión limpia y comentada.
// Soporta enteros y fracciones (punto decimal) en bases 2, 8, 10 y 16.
// Usa BigInt internamente para mantener precisión en enteros grandes.

window.addEventListener("DOMContentLoaded", () => {
    // Referencias al DOM
    const input = document.getElementById("inputValue");
    const sistema = document.getElementById("sistema");
    const outBin = document.getElementById("binario");
    const outOct = document.getElementById("octal");
    const outDec = document.getElementById("decimal");
    const outHex = document.getElementById("hexadecimal");

    /* ---------- Utilidades ---------- */

    /**
     * Devuelve true si el carácter `ch` es válido para la base `base`.
     * Acepta el punto `.` como separador fraccional.
     * Usamos `parseInt(ch, 16)` para transformar 'A'..'F' a su valor numérico.
     */
    function charAllowed(ch, base) {
        if (ch === ".") return true; // permitimos un solo punto en la entrada
        const d = parseInt(ch, 16); // interpreta dígitos hexadecimales si aplica
        return !Number.isNaN(d) && d < base;
    }

    /**
     * Normaliza la entrada: la pasa a mayúsculas, quita espacios extremos
     * y elimina un prefijo '0x' si lo tuviera (hex).
     */
    function normalize(v) {
        if (v === null || v === undefined) return "";
        let s = String(v).trim().toUpperCase();
        if (s.startsWith("0X")) s = s.slice(2);
        return s;
    }

    /* ---------- Parseo de un racional (entero + fracción) ---------- */

    /**
     * parseToRational(v, base)
     * Convierte la cadena `v` (por ejemplo 'A.F' en base 16) en tres valores:
     *  - intPart: BigInt con la parte entera en base 10 interna
     *  - fracNum: BigInt que representa el numerador de la fracción en base `base`
     *  - fracDen: BigInt que representa el denominador (base^digitosFrac)
     *
     * Ejemplo: 'A.F' en base 16 -> intPart = 10, fracNum = 15, fracDen = 16
     */
    function parseToRational(v, base) {
        const s = normalize(v);
        if (s === "") throw new Error("Entrada vacía");
        const parts = s.split(".");
        if (parts.length > 2)
            throw new Error("Formato inválido: más de un punto");

        const intStr = parts[0] || "0"; // parte entera (cadena)
        const fracStr = parts[1] || ""; // parte fraccionaria (cadena)

        // Validar caracteres uno por uno
        for (const ch of intStr + fracStr) {
            if (!charAllowed(ch, base))
                throw new Error("Dígito inválido: " + ch);
        }

        // Parsear la parte entera a BigInt
        let intPart = 0n;
        const b = BigInt(base);
        for (const ch of intStr) {
            const digit = BigInt(parseInt(ch, 16)); // valor numérico del dígito
            intPart = intPart * b + digit;
        }

        // Si no hay fracción, devolvemos fracNum = 0 y fracDen = 1
        if (fracStr === "") return { intPart, fracNum: 0n, fracDen: 1n };

        // Parsear la parte fraccionaria como un numerador en base `base`
        let fracNum = 0n;
        for (const ch of fracStr) {
            const digit = BigInt(parseInt(ch, 16));
            fracNum = fracNum * b + digit;
        }
        // El denominador es base^(cantidad de dígitos fraccionales)
        const fracDen = b ** BigInt(fracStr.length);
        return { intPart, fracNum, fracDen };
    }

    /* ---------- Conversión desde BigInt a cadena en base dada ---------- */

    /**
     * bigIntToBase: convierte un BigInt entero no negativo a su representación
     * en la `base` dada (2..16). Devuelve una cadena (p.ej. 'FF').
     */
    function bigIntToBase(n, base) {
        if (n === 0n) return "0";
        const b = BigInt(base);
        let x = n;
        const digits = [];
        while (x > 0n) {
            const rem = x % b;
            const r = Number(rem); // convertir a number para indexar/mostrar
            // 0..9 => '0'..'9', 10..15 => 'A'..'F'
            digits.push(r < 10 ? String(r) : String.fromCharCode(55 + r));
            x = x / b;
        }
        return digits.reverse().join("");
    }

    /**
     * rationalToBaseString
     * Dado intPart (BigInt), fracNum (BigInt) y fracDen (BigInt), calcula
     * una representación en `targetBase` con `precision` dígitos fraccionarios.
     * Esta función implementa la conversión de la fracción por multiplicaciones sucesivas.
     */
    function rationalToBaseString(
        intPart,
        fracNum,
        fracDen,
        targetBase,
        precision = 12
    ) {
        const intStr = bigIntToBase(intPart, targetBase);
        if (fracNum === 0n) return intStr; // no hay fracción

        // Convertimos la fracción: repetimos (frac * baseDestino) / den
        let num = fracNum;
        const den = fracDen;
        const digits = [];
        for (let i = 0; i < precision && num !== 0n; i++) {
            num = num * BigInt(targetBase);
            const digit = num / den; // parte entera del producto
            const r = Number(digit);
            digits.push(r < 10 ? String(r) : String.fromCharCode(55 + r));
            num = num % den; // resto para siguiente iteración
        }
        return intStr + "." + (digits.length ? digits.join("") : "0");
    }

    /* ---------- Auxiliares de UI y saneamiento ---------- */

    // Mantiene sólo los caracteres válidos para la base y máximo un punto
    function sanitizeInputForBase(raw, base) {
        let s = String(raw).toUpperCase();
        if (s.startsWith("0X")) s = s.slice(2);
        let out = "";
        let dotSeen = false;
        for (const ch of s) {
            if (ch === ".") {
                if (!dotSeen) {
                    dotSeen = true;
                    out += ".";
                }
                continue;
            }
            if (charAllowed(ch, base)) out += ch;
        }
        return out;
    }

    // Activa/desactiva botones según la base seleccionada
    function updateButtonsForBase(base) {
        const buttons = document.querySelectorAll("#teclado button");
        buttons.forEach((btn) => {
            const action = btn.getAttribute("data-action");
            // botones de acción (AC, delete) siempre activos
            if (action) {
                btn.disabled = false;
                return;
            }
            const val = btn.getAttribute("data-value") || "";
            let ok = true;
            for (const ch of val) {
                if (ch === ".") continue; // punto siempre permitido (solo uno se mantendrá)
                if (!charAllowed(ch, base)) {
                    ok = false;
                    break;
                }
            }
            btn.disabled = !ok;
        });
    }

    /* ---------- Actualización de resultados ---------- */

    // Actualiza los 4 spans con las conversiones (o placeholders si no hay input)
    function updateAll() {
        const val = input.value;
        const from = Number(sistema.value);
        if (!val || String(val).trim() === "") {
            outBin.textContent =
                outOct.textContent =
                outDec.textContent =
                outHex.textContent =
                    "—";
            return;
        }
        try {
            const { intPart, fracNum, fracDen } = parseToRational(val, from);
            outBin.textContent = rationalToBaseString(
                intPart,
                fracNum,
                fracDen,
                2
            );
            outOct.textContent = rationalToBaseString(
                intPart,
                fracNum,
                fracDen,
                8
            );
            outDec.textContent = rationalToBaseString(
                intPart,
                fracNum,
                fracDen,
                10
            );
            outHex.textContent = rationalToBaseString(
                intPart,
                fracNum,
                fracDen,
                16
            );
        } catch (err) {
            // Si ocurre error (p.ej. dígito inválido), mostramos placeholders y el error en decimal
            outBin.textContent = outOct.textContent = outHex.textContent = "—";
            outDec.textContent = "Error: " + err.message;
        }
    }

    /* ---------- Listeners UI ---------- */

    // Cuando el usuario escribe en el input, saneamos y actualizamos
    input.addEventListener("input", () => {
        const base = Number(sistema.value);
        const sanitized = sanitizeInputForBase(input.value, base);
        if (sanitized !== input.value) {
            input.value = sanitized; // mantener sólo caracteres válidos
        }
        updateAll();
    });

    // Cuando cambia la base, limpiamos el input y actualizamos botones
    sistema.addEventListener("change", () => {
        input.value = ""; // limpiar entrada al cambiar de base (deseado)
        const base = Number(sistema.value);
        updateButtonsForBase(base);
        updateAll();
    });

    // Inicializar botones según la base por defecto
    updateButtonsForBase(Number(sistema.value));

    // Manejo del teclado en pantalla (delegación de eventos)
    document.getElementById("teclado").addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const val = btn.getAttribute("data-value");
        const action = btn.getAttribute("data-action");
        const base = Number(sistema.value);

        if (action === "clear") {
            // AC - limpiar todo
            input.value = "";
            updateAll();
            return;
        }
        if (action === "delete") {
            // borrar último carácter
            input.value = input.value.slice(0, -1);
            updateAll();
            return;
        }

        if (val !== null) {
            // Añadir el valor del botón al input (saneando según la base)
            const candidate = input.value + val;
            const sanitized = sanitizeInputForBase(candidate, base);
            // Si no hay cambios, significa que el/los caracteres no eran válidos
            if (sanitized === sanitizeInputForBase(input.value, base)) {
                // Mostrar mensaje breve en la columna decimal
                outDec.textContent =
                    "Error: carácter inválido para base " + base;
                setTimeout(updateAll, 800);
                return;
            }
            input.value = sanitized;
            updateAll();
        }
    });
});

/* VERBATIM: script inline do <head> legado - persistencia multi-backend de auth. */
      function buildAuthStorage() {
        try {
          var k = "__ls_probe__";
          localStorage.setItem(k, "1");
          if (localStorage.getItem(k) === "1") {
            localStorage.removeItem(k);
            return {
              getItem: function (key) {
                try {
                  return localStorage.getItem(key);
                } catch (e) {
                  return null;
                }
              },
              setItem: function (key, val) {
                try {
                  localStorage.setItem(key, val);
                } catch (e) {}
              },
              removeItem: function (key) {
                try {
                  localStorage.removeItem(key);
                } catch (e) {}
              },
            };
          }
        } catch (e) {}
        function setCookie(n, v, d) {
          var dt = new Date();
          dt.setTime(dt.getTime() + d * 864e5);
          document.cookie =
            n +
            "=" +
            encodeURIComponent(v) +
            "; expires=" +
            dt.toUTCString() +
            "; path=/; SameSite=Lax";
        }
        function getCookie(n) {
          var m = document.cookie.match(
            new RegExp(
              "(?:^|; )" +
                n.replace(/([.$?*|{}()\[\]\\/+^])/g, "\\$1") +
                "=([^;]*)",
            ),
          );
          return m ? decodeURIComponent(m[1]) : null;
        }
        function delCookie(n) {
          document.cookie =
            n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        }
        try {
          var ck = "__ck_probe__";
          setCookie(ck, "1", 1);
          if (getCookie(ck) === "1") {
            delCookie(ck);
            var CH = 3500;
            return {
              getItem: function (key) {
                var meta = getCookie(key + "__n");
                if (!meta) return getCookie(key);
                var n = parseInt(meta, 10),
                  out = "";
                for (var i = 0; i < n; i++) {
                  var part = getCookie(key + "__" + i);
                  if (part == null) return null;
                  out += part;
                }
                return out;
              },
              setItem: function (key, val) {
                if (val.length <= CH) {
                  setCookie(key, val, 7);
                  delCookie(key + "__n");
                  return;
                }
                var n = Math.ceil(val.length / CH);
                setCookie(key + "__n", String(n), 7);
                for (var i = 0; i < n; i++)
                  setCookie(key + "__" + i, val.slice(i * CH, (i + 1) * CH), 7);
                delCookie(key);
              },
              removeItem: function (key) {
                delCookie(key);
                var meta = getCookie(key + "__n");
                if (meta) {
                  var n = parseInt(meta, 10);
                  for (var i = 0; i < n; i++) delCookie(key + "__" + i);
                  delCookie(key + "__n");
                }
              },
            };
          }
        } catch (e) {}
        var mem = {};
        return {
          getItem: function (k) {
            return k in mem ? mem[k] : null;
          },
          setItem: function (k, v) {
            mem[k] = String(v);
          },
          removeItem: function (k) {
            delete mem[k];
          },
        };
      }
      function diagnoseAuthStorage(storage, storageKey) {
        var safe = function (fn, fb) {
          try {
            return fn();
          } catch (e) {
            return fb;
          }
        };
        var raw = safe(function () {
          return storage.getItem(storageKey);
        }, null);
        var lsKeys = safe(function () {
          return Object.keys(localStorage);
        }, "blocked");
        var cookiesLen = safe(function () {
          return (document.cookie || "").length;
        }, "blocked (sandboxed)");
        var inIframe = window.top !== window.self;
        var sandboxed = cookiesLen === "blocked (sandboxed)";
      }
      window.buildAuthStorage = buildAuthStorage;
      window.diagnoseAuthStorage = diagnoseAuthStorage;

      /* ── Multi-backend auth helpers ─────────────────────────────────── */
      var authCookie = {
        set: function (name, value, days) {
          try {
            var d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            var secure = location.protocol === "https:" ? "; Secure" : "";
            document.cookie =
              name +
              "=" +
              encodeURIComponent(value) +
              "; expires=" +
              d.toUTCString() +
              "; path=/; SameSite=Lax" +
              secure;
            return this.get(name) === value;
          } catch (e) {
            console.error("authCookie.set failed:", e);
            return false;
          }
        },
        get: function (name) {
          try {
            var match = document.cookie
              .split("; ")
              .find(function (row) {
                return row.startsWith(name + "=");
              });
            return match
              ? decodeURIComponent(match.split("=")[1])
              : null;
          } catch (e) {
            return null;
          }
        },
        remove: function (name) {
          try {
            document.cookie =
              name +
              "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
          } catch (e) {}
        },
      };

      var authWinName = {
        _parse: function () {
          try {
            var parts = (window.name || "").split("|");
            var map = {};
            for (var i = 0; i < parts.length; i++) {
              var idx = parts[i].indexOf("=");
              if (idx > 0)
                map[parts[i].substring(0, idx)] = decodeURIComponent(
                  parts[i].substring(idx + 1),
                );
            }
            return map;
          } catch (e) {
            return {};
          }
        },
        _serialize: function (map) {
          return Object.keys(map)
            .map(function (k) {
              return k + "=" + encodeURIComponent(map[k]);
            })
            .join("|");
        },
        set: function (key, value) {
          try {
            var map = this._parse();
            map[key] = value;
            window.name = this._serialize(map);
            return true;
          } catch (e) {
            console.error("authWinName.set failed:", e);
            return false;
          }
        },
        get: function (key) {
          try {
            return this._parse()[key] || null;
          } catch (e) {
            return null;
          }
        },
        remove: function (key) {
          try {
            var map = this._parse();
            delete map[key];
            window.name = this._serialize(map);
          } catch (e) {}
        },
      };

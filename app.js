// Importación de módulos:
const express = require("express");
const mysql = require("mysql");
const util = require("util"); //necesario para trabajar con async await
const cors = require("cors");
const { nextTick } = require("process");

const app = express();
const PORT = process.env.PORT ? process.env.PORT : 3000;

app.use(express.json());
app.use(cors());

const conexion = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "listalibros"
});

conexion.connect();
const qy = util.promisify(conexion.query).bind(conexion); // declaro como voy a llamar a la funcion async await

//CATEGORIA
//POST/categoria - recibe nombre retorna 200 {id, nombre}, 413 {'errores'}

app.post("/api/categorias", async (req, res) => {
  try {
    const nombre = req.body.nombre.toUpperCase().trim();
    //Valido que envien correctamente la info:
    if (!nombre) {
      throw new Error("Falta enviar el nombre");
    }
    //Consulto si la categoria ya es existente:
    let query = "SELECT nombre FROM categoria WHERE nombre = ?";
    let respuesta = await qy(query, [nombre]);

    if (respuesta.length > 0) {
      throw new Error("Esa categoria ya existe");
    }

    //Guardo la nueva categoria:
    query = "INSERT INTO categoria (nombre) VALUE (?)";
    respuesta = await qy(query, [nombre]);

    //Envio la info:
    res.send({
      respuesta: "ID: " + respuesta.insertId + ", nombre: " + nombre,
    });
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//GET/categoria - retorna 200 [{id, nombre}], 413 y []

app.get("/api/categorias", async (req, res) => {
  try {
    const query = "SELECT * FROM categoria";

    const respuesta = await qy(query);

    res.send(respuesta);
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//GET/categoria/:id - retorna 200 {id, nombre}, 413 {'errores'}

app.get("/api/categorias/:id", async (req, res) => {
  try {
    let query = "SELECT * FROM categoria WHERE id = ?";
    let respuesta = await qy(query, [req.params.id]);

    if (respuesta.length == 0) {
      throw {
        message: "La categoría no existe.",
        status: 413,
      };
    }

    res.json(respuesta);
    console.log("Operación realizada de manera correcta, sin errores.");
    res.status(200);
  } catch (e) {
    if (e.status == null) {
      res.status(413).send({ Error: "Error inesperado." });
    }

    res.status(413).send(e.message);
  }
});

app.put("/api/categorias/:id", async (req, res) => {
  try {
    const consulta = await qy("SELECT * FROM categoria WHERE id=?", [
      req.params.id,
    ]);

    if (consulta.length == 1) {
      if (!req.body.nombre) {
        throw new Error("Faltan datos.");
      }

      const nombre = req.body.nombre;

      await qy(
        "UPDATE categoria SET nombre=? WHERE id=?",
        [nombre, req.params.id]
      );
      const respuesta = await qy("SELECT * FROM categoria WHERE id=?", [
        req.params.id,
      ]);
      res.send(respuesta);

    } else {
      throw new Error(
        "La categoria que intenta modificar no se encuentra en la base de datos."
      );
    }
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//DELETE/categoria/:id - retorna 200 y {'se borro correctamente}, 413 {'errores}

app.delete("/api/categorias/:id", async (req, res) => {
  try {
    let query = "SELECT * FROM libro WHERE categoria_id = ?";

    let respuesta = await qy(query, [req.params.id]);

    if (respuesta.length > 0) {
      throw {
        message: "La categoria tiene libros asociados. NO se puede ELIMINAR.",
        status: 413,
      };
    }

    query = "SELECT * FROM categoria WHERE id = ?";

    respuesta = await qy(query, [req.params.id]);

    if (respuesta.length == 0) {
      throw {
        message: "No existe la categoría indicada.",
        status: 413,
      };
    }

    query = "DELETE FROM categoria WHERE id = ?";

    respuesta = await qy(query, [req.params.id]);

    res.send({ respuesta: "La categoría se eliminó correctamente" });
    res.status(200);
  } catch (e) {
    if (e.status == null) {
      res.status(413).send({ Error: "Error inesperado." });
    }

    res.status(e.status).send(e.message);
  }
});

//PERSONA
//POST/persona - recibe {nombre, apellido, alias, email} retorna 200 {id, nombre, apellido, alias, email} 413 {'errores'}

app.post("/api/personas", async (req, res) => {
  try {
    const nombre = req.body.nombre.toUpperCase().trim();
    const apellido = req.body.apellido.toUpperCase().trim();
    const alias = req.body.alias.toUpperCase().trim();
    const email = req.body.email.toUpperCase().trim();

    if (!nombre || !apellido || !alias || !email) {
      throw new Error("Todos los campos deben ser completados.");
    }
    let email_check = await qy("SELECT email FROM persona WHERE email = ?", [
      email,
    ]);

    if (email_check.length > 0) {
      throw new Error("El e-mail proporcionado ya se encuentra en uso.");
    }

    const respuesta = await qy(
      "INSERT into persona (nombre, apellido, alias, email) values (?, ?, ?, ?)",
      [nombre, apellido, alias, email]
    );
    const registroInsertado = await qy("SELECT * FROM persona WHERE id=?", [
      respuesta.insertId,
    ]);
    res.send(registroInsertado[0]);
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//GET/persona - retorna 200 [{id, nombre, apellido, alias, email}], 413 y []

app.get("/api/personas", async (req, res) => {
  try {
    const respuesta = await qy("select * from persona");
    res.json(respuesta);
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//GET/persona/:id - retorna 200 {id, nombre, apellido, alias, email}, 413 {'errores}

app.get("/api/personas/:id", async (req, res) => {
  try {
    const respuesta = await qy("select * from persona where id=?", [
      req.params.id,
    ]);

    if (!respuesta.length > 0) {
      throw new Error("No se encuentra esa persona");
    }
    res.json(respuesta[0]);
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//PUT/persona/:id - recibe {nombre, apellido, alias, email} no se puede modificar email, retorna 200 {y el objeto modificado}, 413 {'errores'}

app.put("/api/personas/:id", async (req, res) => {
  try {
    const consulta = await qy("SELECT * FROM persona WHERE id=?", [
      req.params.id,
    ]);

    if (consulta.length == 1) {
      if (!req.body.nombre || !req.body.apellido || !req.body.alias) {
        throw new Error("Todos los campos son requeridos.");
      }

      const nombre = req.body.nombre;
      const apellido = req.body.apellido;
      const alias = req.body.alias;

      await qy(
        "UPDATE persona SET nombre=?, apellido=?, alias=? WHERE id=?",
        [nombre, apellido, alias, req.params.id]
      );
      const respuesta = await qy("SELECT * FROM persona WHERE id=?", [
        req.params.id,
      ]);
      res.send(respuesta[0]);
    } else {
      throw new Error(
        "La persona que intenta modificar no se encuentra en la base de datos."
      );
    }
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//DELETE/persona/:id - retorna 200 {'se borro correctamente'}, 413 {'errores'}

app.delete("/api/personas/:id", async (req, res) => {
  try {
    const registro = await qy("SELECT * FROM persona WHERE id=?", [
      req.params.id,
    ]);
    if (registro.length == 1) {
      const consulta = await qy(
        "SELECT persona_id FROM libro WHERE persona_id=?",
        [req.params.id]
      );
      if (consulta.length == 0) {
        await qy("DELETE FROM persona WHERE id=?", [req.params.id]);
        res.json("La persona seleccionada se borró exitosamente.");
      } else {
        throw new Error(
          "La persona que intenta eliminar tiene uno o más libros asociados."
        );
      }
    } else {
      throw new Error(
        "La persona que intenta eliminar no se encuentra en la base de datos."
      );
    }
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//LIBRO
//POST/libro - recibe {nombre, descripcion, categoria_id, persona_id}, retorna 200 {id, nombre, descripcion, categoria, categoria_id, persona_id}, 413 {'errores'}

app.post("/api/libros", async (req, res) => {
  try {
    if (!req.body.nombre || !req.body.categoria_id) {
      throw new Error("nombre y categoria son datos obligatorios");
    }
    if (!req.body.descripcion) {
      throw new Error("Faltan enviar datos");
    }
    const nombre = req.body.nombre.toUpperCase().trim();
    const descripcion = req.body.descripcion.toUpperCase().trim();
    let consulta = "SELECT id FROM libro WHERE nombre = ?";
    let respuesta = await qy(consulta, [nombre]);

    if (respuesta.length > 0) {
      throw new Error("Ese libro ya existe");
    }

    consulta = "SELECT * FROM categoria WHERE id=?";
    respuesta = await qy(consulta, [req.body.categoria_id]);

    if (!respuesta.length > 0) {
      throw new Error("No existe esa categoria");
    }

    if (req.body.persona_id != null && req.body.persona_id != 0) {
      consulta = "SELECT * FROM persona WHERE id = ?";
      respuesta = await qy(consulta, [req.body.persona_id]);
      if (respuesta.length == 0) {
        throw new Error("no existe la persona indicada");
      }
    }

    //guardo nuevo libro
    consulta =
      "INSERT INTO libro (nombre, descripcion, categoria_id, persona_id) VALUES (?, ?, ?, ?)";
    respuesta = await qy(consulta, [
      nombre,
      descripcion,
      req.body.categoria_id,
      req.body.persona_id,
    ]);

    const datosInsertados = await qy("SELECT * FROM libro WHERE id = ?", [
      respuesta.insertId,
    ]);
    res.json(datosInsertados);
    // res.status(200).send({"mensaje":"Se ha grabado correctamente"});
  } catch (e) {
    if (
      e.message != "No existe esa categoria" &&
      e.message != "Faltan enviar datos" &&
      e.message != "no existe la persona indicada" &&
      e.message != "nombre y categoria son datos obligatorios" &&
      e.message != "Ese libro ya existe"
    ) {
      res.status(413).send({ Error: "error inesperado" });
      //return;
    }
    res.status(413).send(e.message);
  }
});

//GET/libro - retorna 200 [{id, nombre, descripcion, categoria_id, persona_id}], 413 {'errores'}

app.get("/api/libros", async (req, res) => {
  try {
    const respuesta = await qy("SELECT * FROM libro");
    res.send(respuesta);
  } catch (e) {
    res.status(413).send(e.message);
  }
});

//GET/libro/:id - retorna 200 {id, nombre, descripcion, categoria_id, persona_id}, 413 {'errores'}

app.get("/api/libros/:id", async (req, res) => {
  try {
    const respuesta = await qy("SELECT * FROM libro WHERE id = ?", [
      req.params.id,
    ]);
    if (respuesta.length == 0) {
      throw new Error("No se encuentra ese libro");
    } else {
      res.send(respuesta);
    }
  } catch (e) {
    if (e.message != "No se encuentra ese libro") {
      res.status(413).send({ Error: "error inesperado" });
    }
    res.status(413).send(e.message);
  }
});

//PUT/libro/:id - recibe {id, nombre, descripcion, categoria_id, persona_id}, retorna 200 {id, nombre, descripcion, categoria_id, persona_id}modificado, 413 {'errores'}

app.put("/api/libros/:id", async (req, res) => {
  try {
    const descripcion = req.body.descripcion.toUpperCase().trim();

    let query =
      "SELECT nombre, categoria_id, persona_id FROM libro WHERE id = ?";

    let respuesta = await qy(query, [req.params.id]);

    if (respuesta.length == 0) {
      throw {
        message: "No se encuentra ese libro.",
        status: 404,
      };
    }

    if (
      respuesta[0].nombre != req.body.nombre.toUpperCase().trim() ||
      respuesta[0].categoria_id != req.body.categoria_id ||
      respuesta[0].persona_id != req.body.persona_id
    ) {
      throw {
        message: "Sólo se puede modificar la descripción del libro.",
        status: 404,
      };
    }

    query = "UPDATE libro SET descripcion = ? WHERE id = ?";

    respuesta = await qy(query, [descripcion, req.params.id]);

    const registroInsertado = await qy("SELECT * FROM libro WHERE id=?", [
      req.params.id,
    ]);

    res.json(registroInsertado);
    console.log("Operación realizada de manera correcta, sin errores.");
  } catch (e) {
    if (e.status == null) {
      res.status(500).send({ Error: "Error inesperado." });
    }

    res.status(e.status).send(e.message);
  }
});

//PUT/libro/prestar/:id - recibe:{id, persona_id}, retorna 200 y {'se presto correcamente}

app.put("/api/libros/prestar/:id", async (req, res) => {
  try {
    let query = "SELECT * FROM libro WHERE id=?";
    let respuesta = await qy(query, [req.params.id]);

    if (!respuesta.length > 0) {
      throw {
        name: "bookDoesNotExist",
        message: "No se encontro el libro",
      };
    }
    // la concha de tu madre all boys

    query = "SELECT persona_id FROM libro WHERE id=?";
    respuesta = await qy(query, [req.params.id]);

    if (respuesta[0].persona_id > 0) {
      throw {
        name: "libroPrestado",
        message:
          "El libro ya se encuentra prestado, no se puede prestar hasta que no se devuelva",
      };
    }

    query = "SELECT * FROM persona WHERE id=?";
    respuesta = await qy(query, [req.body.persona_id]);

    if (!respuesta.length > 0) {
      throw {
        name: "personaNotFound",
        message:
          "No se encontro la persona a la que se quiere prestar el libro",
      };
    }

    query = "UPDATE libro SET persona_id = (?) WHERE id=?";
    respuesta = await qy(query, [req.body.persona_id, req.params.id]);

    res.json("Se presto correctamente");
  } catch (e) {
    if (e.name == null) {
      res.status(413).send("Error inesperado");
    }
    res.status(413).send(e.message);
  }
});

//PUT/libro/devolver/:id - retorna 200

app.put("/api/libros/devolver/:id", async (req, res) => {
  try {
    let query = "SELECT * FROM libro WHERE id=?";
    let respuesta = await qy(query, [req.params.id]);

    if (!respuesta.length > 0) {
      throw {
        name: "bookDoesNotExist",
        message: "Ese libro no existe",
      };
    }
    query = "SELECT persona_id FROM libro WHERE id=?";
    respuesta = await qy(query, [req.params.id]);

    if (!respuesta[0].persona_id > 0) {
      throw {
        name: "libroEnStock",
        message: "Ese libro no estaba prestado",
      };
    }

    query = "UPDATE libro SET persona_id = (null) WHERE id = ?";
    respuesta = await qy(query, [req.params.id]);

    res.json("Se realizo la devolucion correctamente");
  } catch (e) {
    if (e.name == null) {
      res.status(413).send("Error inesperado");
    }
    res.status(413).send(e.message);
  }
});

//DELETE/libro/:id - retorna 200 {'se borro correctamente}, 413 {'errores'}

app.delete("/api/libros/:id", async (req, res) => {
  try {
    let query = "SELECT * FROM libro WHERE id = ?";

    let respuesta = await qy(query, [req.params.id]);

    if (respuesta.length == 0) {
      throw {
        message: "No se encuentra ese libro.",
        status: 413,
      };
    }

    query = "SELECT persona_id FROM libro WHERE id = ?";

    respuesta = await qy(query, [req.params.id]);

    if (respuesta[0].persona_id != null) {
      throw {
        message: "Ese libro está prestado, NO se puede borrar.",
        status: 413,
      };
    }

    query = "DELETE FROM libro WHERE id = ?";

    respuesta = await qy(query, [req.params.id]);

    res.send({ respuesta: "El libro se eliminó correctamente" });
    res.status(200);
  } catch (e) {
    if (e.status == null) {
      res.status(413).send({ Error: "Error inesperado." });
    }

    res.status(e.status).send(e.message);
  }
});

app.listen(PORT, () => {
  console.log("App corriendo en el puerto ", PORT);
});

// Integrantes:---

// Lucas Aranguren
// María Emilia Lesca
// Ignacio Garcia
// Sofía Cacace
// Emmanuel Galera
// Daniel Flores
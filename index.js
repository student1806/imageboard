const express = require("express");
const multer = require("multer");
const uidSafe = require("uid-safe");
const path = require("path");
const s3 = require("./s3");
const { s3Url } = require("./config.json");

const app = express();
app.use(express.json());

const diskStorage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, __dirname + "/uploads");
    },
    filename: function(req, file, callback) {
        uidSafe(24).then(function(uid) {
            callback(null, uid + path.extname(file.originalname));
        });
    }
});

const uploader = multer({
    storage: diskStorage,
    limits: {
        fileSize: 2097152
    }
});
const db = require("./utils/db");

app.use(express.static("./public"));

app.post("/upload", uploader.single("file"), s3.upload, (req, res) => {
    const { title, description, username } = req.body;
    const imageUrl = `${s3Url}${req.file.filename}`;
    db.addImage(imageUrl, username, title, description)
        .then(({ rows }) => {
            res.json({
                image: rows[0]
            });
        })
        .catch(err => {
            console.log(err);
        });
});

app.post("/comment", (req, res) => {
    const { username, comment, id } = req.body;
    db.addComment(username, comment, id)
        .then(({ rows }) => {
            res.json({
                image: rows[0]
            });
            //console.log(rows);
        })
        .catch(err => {
            console.log("error on the post up load comment req: ", err);
        });
});

app.get("/images", (req, res) => {
    db.getImages(6)
        .then(result => {
            res.json(result.rows);
        })
        .catch(err => {
            console.log("error on the image rout: ", err);
        });
});

app.get("/current-image/:id", (req, res) => {
    const { id } = req.params;
    console.log(id);
    db.getImageId(id)
        .then(result => {
            db.getComments(id)
                .then(data => {
                    res.json({
                        image: result.rows[0],
                        comments: data.rows
                    });
                })
                .catch(err => {
                    console.log("Error on the get comments rout ", err);
                });
        })
        .catch(err => {
            console.log("Error on the get comments rout ", err);
        });
});

app.listen(8080, () => console.log("image board on port 8080"));

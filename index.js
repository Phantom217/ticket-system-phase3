var express = require('express');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var js2xmlparser = require('js2xmlparser');
var xml2js = require('xml2js');
var parser = require('express-xml-parser');

var TICKETS_COLLECTION = "tickets";

var app = express();
var router = express.Router();

app.use('/rest', router);
app.use(bodyParser());
app.use(parser);

var db;

/* connect to the db before starting application server */
mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test",
                           { useNewUrlParser: true }, function (err, client) {
        if (err) {
            console.log(err);
            process.exit(1);
        }

        /* save db object from callback for reuse */
        db = client.db;
        console.log("database connection ready");

        /* init app */
        var server = app.listen(process.env.PORT || 8080, function () {
            var port = server.address().port;
            console.log("App running on port ", port);
        });
    });

/////////////////////////
//  TICKET API ROUTES  //
/////////////////////////

/* Error Handler used by all endpoints */
function handleError(res, reason, message, code)
{
    console.log("ERROR: " + reason);
    res.status(code || 500).json({"error" : message});
}

/* list all tickets */
router.get("/tickets", function(req, res) {
    db.collection(TICKETS_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                handleError(res, err.message, "Failed to get tickets.");
            }
            else {
                res.status(200).json(docs);
            }
        });
});

/* create new ticket */
app.post("/rest/ticket", function(req, res) {
    var newTicket = req.body;
    newTicket.created_at = new Date();

    if (!req.body.id) {
        handleError(res, "Invalid input", "Required Field", 400);
    } else {
        db.collection(TICKETS_COLLECTION).insertOne(newTicket, function(err, doc) {
            if (err) {
                handleError(res, err.message, "Failed to create new ticket.");
            } else {
                res.statis(201).json(doc.ops[0]);
            }
        });
    }
});

/* find ticket by id */
router.get("/ticket/:id", function(req,res) {
    db.collection(TICKETS_COLLECTION).findOne({ id:req.params.id }, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get ticket");
        } else {
            res.status(200).json(doc);
        }
    });
});

/* find ticket by id and send back as xml */
router.get("xml/ticket/:id", function(req,res) {
    db.collection(TICKETS_COLLECTION).findOne({ id:req.params.id }. function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get ticket");
        } else {
            to_json = JSON.stringify(doc);
            json_doc = JSON.parse(to_json);
            xml_doc = js2xmlparser("ticket", json_doc);

            res.set('Content-Type', 'text/xml');
            res.send(xml_doc);
        }
    });
});

/* update ticket by id */
app.put("/rest/ticket/:id", function(req, res) {
    var updateDoc = req.body;

    db.collection(TICKETS_COLLECTION).updateOne({ "id" : updateDoc.id }. { $set: {
        "updated_at" : new Date(),
        "type" : updateDoc.type,
        "subject" : updateDoc.subject,
        "description" : updateDoc.description,
        "priority" : updateDoc.priority,
        "submitter" : updateDoc.submitter,
        "recipient" : updateDoc.recipient,
        "assignee_id" : updateDoc.assignee_id,
        "follower_ids" : updateDoc.follower_ids,
        "tags" : updateDoc.tags,
    }}, function(err, doc) {
        if (err) {
            handleError(req, err.message, "Failed to update.");
        } else {
            updateDoc._id = req.params.id;
            res.status(200).json(updateDoc);
        }
    });
});

/* update xml ticket by id */
app.put("/rest/xml/ticket/:id", function(req,res) {
    var updateXmlDoc = req.body;

    var xml = '<data>\
    <_id>86siuc9ax8d9a82s1</_id>\
    <id>01</id>\
    <created_at>2019-05-12T21:51:59.512Z</created_at>\
    <updated_at>2019-05-12T21:51:59.512Z</updated_at>\
    <type>test</test>\
    <subject>testing</subject>\
    <description>more testing</description>\
    <priority>med</priority>\
    <status>test</status>\
    <submitter>testee</submitter>\
    <recipient>tester</recipient>\
    <assignee_id>001</assignee_id>\
    <follower_ids>001</follower_ids>\
    <follower_ids>002</follower_ids>\
    <tags>test</tags>\
    <tags>testing</tags>\
    </data>'

    xml2js.parseString(xml, function(err, res) {
        xml_json = JSON.stringify(res);
    });
    console.log(xml_json);

    db.collection(TICKETS_COLLECTION).updateOne({ "id" : xml_json.id }. , { $set: {
        "updated_at" : new Date(),
        "type" : xml_json.type,
        "subject" : xml_json.subject,
        "description" : xml_json.description,
        "priority" : xml_json.priority,
        "submitter" : xml_json.submitter,
        "recipient" : xml_json.recipient,
        "assignee_id" : xml_json.assignee_id,
        "follower_ids" : xml_json.follower_ids,
        "tags" : xml_json.tags,

    }}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update ticket");
        } else {
            xml_json._id = req.params.id;
            res.status(200).xml(xml_json);
        }
    });
});

/* delete ticket by id */
router.delete("/ticket/:id", function(req, res) {
    db.collection(TICKETS_COLLECTION).deleteOne({ id:req.params.id }, function(err, res) {
        if (err) {
            handleError(res, err.message, "Failed to delete ticket");
        } else {
            res.status(200).json("Ticket "+ req.params.id + " deleted.");
        }
    });
});

// On this updated version of the project we will add a database with mongodb
// in order to store the items we have in the todo list

import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";

const app = express();
const port = 3000;

const date = new Date();
const year_footer = date.getFullYear();  // Variable to put year in Footer
const time_zone = 'en-US';
const format = {weekday: 'long', month: 'long', day: 'numeric' };
const string_date = date.toLocaleDateString(time_zone, format);  // Variable to get date in Today List

// All of this commented code was made to create the database
// Now we will create a Database to store the items in the list

// // This code is to connect to the database in my local computer
// mongoose.connect('mongodb://127.0.0.1:27017/TodoListDBUpdated').
//   catch(error => handleError(error));

// This code is to connect to the database in the cloud thanks to Atlas
mongoose.connect('mongodb+srv://Daniel99Solis:Nzcf3zV3Jg7ImlLq@cluster0.ofbn8vp.mongodb.net/TodoListDB').
  catch(error => handleError(error));


// Creation of the Schemas
const taskSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, "No description was given"]
  },
  check: {
    type: Boolean
  }
});

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "No name was given"]
  },
  tasks: [taskSchema]
});

// Now we create the models
const Task = mongoose.model('Task', taskSchema);
const List = mongoose.model('List', listSchema);


// This code is to add data into the database in case there is no data 
List.find()
.then(function (list) {
    // mongoose.connection.close();
    if (list.length === 0) {
      const welcometask = new Task({description: "Welcome to your List", check: false});
      const checktask = new Task({description: "<-- With this you check a task as completed", check: false});
      const deletetask = new Task({description: "Once the task is check it can be deleted -->", check: true});

      const array_task = [welcometask, checktask, deletetask];

      Task.insertMany(array_task);

      const default_list = new List({
        name: "Today",
        tasks: array_task
      })

      default_list.save();
    } else {
      console.log("There are already list created");
    }
})
.catch(function (err) {
    console.log(err);
});


app.use(express.static("public"));  //This is how we add our static files to our app

app.use(bodyParser.urlencoded({ extended: true }));  // To get the data inside the body of html


// This is the main page where the default list will be shown 
app.get("/", async (req, res) => {
  const list_title = "Today";
  const currentlist = await List.findOne({ name: list_title});
  const tasks = currentlist.tasks;
  const all_list = await List.find();
  const list_names = [];
  all_list.forEach((list) => list_names.push(list.name));
  console.log(list_names);
  res.render("index.ejs", {title: list_title, year: year_footer, date: string_date, list: tasks, names: list_names});
});


// With this route we can create new list
app.post("/newList", async (req, res) => {
  const name = req.body.Lname;
  if (name === ""){
    console.log("No value given");
  } else {
    // Check if the list the user want to create already exist
    const name_exist = await List.findOne({ name: name});
    if (name_exist === null){
        const welcometask = new Task({description: "Welcome to your List", check: false});
        const checktask = new Task({description: "<-- With this you check a task as completed", check: false});
        const deletetask = new Task({description: "Once the task is check it can be deleted -->", check: true});
        
        const array_task = [welcometask, checktask, deletetask];
        await Task.insertMany(array_task);

        const new_list = new List({
          name: name,
          tasks: array_task
        })

        new_list.save();

        res.redirect("/list/" + name);
    } else {
      console.log("List is already created");
      res.redirect("/list/" + name);
    }
  }
});

// Here we show a list by the selection or creation of the user
app.get("/list/:ListName", async (req, res) => {
  const list_title = req.params.ListName;
  console.log(list_title);
  const currentlist = await List.findOne({ name: list_title});
  const tasks = currentlist.tasks;
  const all_list = await List.find();
  const list_names = [];
  all_list.forEach((list) => list_names.push(list.name));
  console.log(list_names);
  res.render("index.ejs", {title: list_title, year: year_footer, date: string_date, list: tasks, names: list_names});
});


// Here we add task depending on the list the user is in
app.post("/add/:ListName", (req, res) => {
  const newtask = new Task({description: req.body["fTask"], check: false});
  newtask.save();
  const list_title = req.params.ListName;
  List.findOne({ name: list_title})
  .then(function (list) {
      // mongoose.connection.close();
      list.tasks.push(newtask);
      list.save();
      res.redirect("/list/" + list_title);
  })
  .catch(function (err) {
      console.log(err);
  });
})


// With this route we check or unchecked the task in an specific list
app.post("/check/:ListName", async (req, res) => {
  const list_title = req.params.ListName;
  const check = req.body.checkbox;
  const idtask = req.body.id_task;

  // Condition if the checkbox has been checked
  if(check === "on"){
    //IMPORTANT NOTE: THIS PART WAS QUITE DIFFICULT, BUT WITH SOME SEARCH I COULD DO IT
    // https://stackoverflow.com/questions/61002409/update-nested-documents-inside-array-based-on-condition
    // https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/
    const query = { name: list_title };
    await List.findOneAndUpdate(
      query, 
      {$set: {"tasks.$[task].check": true} },
      {arrayFilters: [ { "task._id": idtask} ]}
    );
    res.redirect("/list/" + list_title);
  // Action to take in case has been unchecked
  } else {
    const query = { name: list_title };
    await List.findOneAndUpdate(
      query, 
      {$set: {"tasks.$[task].check": false} },
      {arrayFilters: [ { "task._id": idtask} ]}
    );
    res.redirect("/list/" + list_title);
  }
})

app.post("/delete/:ListName", async (req, res) => {
  const list_title = req.params.ListName;
  const task_id = req.body.id_task;
  console.log(list_title);
  console.log(task_id);
  const query = { name: list_title };
  await List.findOneAndUpdate(
    query, 
    {$pull: {tasks: {_id: task_id } } }
  );
  res.redirect("/list/" + list_title);
})


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});



import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const TaskDetail = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTask({
        id: id,
        title: "Sample Task",
        description: "This is a detailed description of the task.",
        status: "in-progress",
        priority: "medium",
        assignee: "John Doe",
        dueDate: "2025-06-15",
        createdAt: "2025-06-10",
      });
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) {
    return <div>Loading task details...</div>;
  }

  if (!task) {
    return <div>Task not found</div>;
  }

  return (
    <div className="task-detail">
      <h1>{task.title}</h1>
      <div className="task-info">
        <p>
          <strong>Description:</strong> {task.description}
        </p>
        <p>
          <strong>Status:</strong> {task.status}
        </p>
        <p>
          <strong>Priority:</strong> {task.priority}
        </p>
        <p>
          <strong>Assignee:</strong> {task.assignee}
        </p>
        <p>
          <strong>Due Date:</strong> {task.dueDate}
        </p>
        <p>
          <strong>Created:</strong> {task.createdAt}
        </p>
      </div>
      <div className="task-actions">
        <button className="btn btn-primary">Edit Task</button>
        <button className="btn btn-secondary">Mark Complete</button>
        <button className="btn btn-danger">Delete Task</button>
      </div>
    </div>
  );
};

export default TaskDetail;

import { isConfigured, supabase } from "./supabase.js";

const form = document.querySelector("#giftForm");
const employeeSelect = document.querySelector("#employee");
const detailFields = {
  designation: document.querySelector("#designation"),
  unit: document.querySelector("#unit"),
  branch: document.querySelector("#branch"),
  department: document.querySelector("#department")
};
const spaPanel = document.querySelector("#spaPanel");
const spaRadios = [...document.querySelectorAll('[name="spaTreatment"]')];
const submitButton = document.querySelector("#submitButton");
const formError = document.querySelector("#formError");
const configError = document.querySelector("#configError");
const confirmation = document.querySelector("#confirmation");

let employees = [];

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

function setLoading(button, loading) {
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  button.setAttribute("aria-busy", String(loading));
}

function selectedEmployee() {
  return employees.find(employee => String(employee.id) === employeeSelect.value);
}

function fillEmployeeDetails(employee) {
  Object.entries(detailFields).forEach(([key, input]) => {
    input.value = employee?.[key] ?? "";
  });
}

async function loadEmployees() {
  if (!isConfigured) {
    configError.hidden = false;
    employeeSelect.innerHTML = '<option value="">Supabase connection required</option>';
    return;
  }

  const { data, error } = await supabase
    .from("staff")
    .select("id, employee_name, designation, unit, branch, department")
    .eq("active", true)
    .order("employee_name");

  if (error) {
    configError.hidden = false;
    configError.querySelector("span").textContent = "The employee list could not be loaded. Please try again later.";
    employeeSelect.innerHTML = '<option value="">Employee list unavailable</option>';
    return;
  }

  employees = data ?? [];
  employeeSelect.replaceChildren(new Option("Select your name", ""));
  employees.forEach(employee => employeeSelect.add(new Option(employee.employee_name, String(employee.id))));
  employeeSelect.disabled = false;
  submitButton.disabled = false;
}

employeeSelect.addEventListener("change", () => {
  fillEmployeeDetails(selectedEmployee());
  clearError();
});

document.querySelectorAll('[name="gift"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const selectingSpa = radio.checked && radio.value === "Tranquility Spa";
    spaPanel.hidden = !selectingSpa;
    spaRadios.forEach(option => {
      option.required = selectingSpa;
      if (!selectingSpa) option.checked = false;
    });
    clearError();
  });
});

function addSummaryItem(list, label, value, options = {}) {
  const item = document.createElement("div");
  item.className = "summary-item";
  if (options.wide) item.classList.add("summary-item--wide");
  if (options.gift) item.classList.add("summary-item--gift");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  item.append(term, description);
  list.append(item);
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  clearError();

  const employee = selectedEmployee();
  const gift = document.querySelector('[name="gift"]:checked');
  const spa = document.querySelector('[name="spaTreatment"]:checked');

  if (!employee || !gift || (gift.value === "Tranquility Spa" && !spa) || !form.checkValidity()) {
    showError(gift?.value === "Tranquility Spa" && !spa
      ? "Please select one Tranquility Spa treatment."
      : "Please complete all required fields before submitting.");
    form.reportValidity();
    return;
  }

  setLoading(submitButton, true);
  const { data, error } = await supabase.rpc("submit_gift_selection", {
    p_staff_id: employee.id,
    p_gift_name: gift.value,
    p_spa_treatment: gift.value === "Tranquility Spa" ? spa.value : null
  });
  setLoading(submitButton, false);

  if (error) {
    const duplicate = error.message.toLowerCase().includes("already been submitted") || error.code === "23505";
    showError(duplicate
      ? "A gift selection has already been submitted for this employee. Please contact the administrator if it needs to be changed."
      : "We could not save your selection. Please check your connection and try again.");
    return;
  }

  const summary = document.querySelector("#summary");
  summary.replaceChildren();
  addSummaryItem(summary, "Employee Name", employee.employee_name);
  addSummaryItem(summary, "Designation", employee.designation);
  addSummaryItem(summary, "Unit", employee.unit);
  addSummaryItem(summary, "Branch", employee.branch);
  addSummaryItem(summary, "Department", employee.department);
  addSummaryItem(summary, "Selected Gift", gift.value, { wide: true, gift: true });
  if (spa) addSummaryItem(summary, "Spa Treatment", spa.value, { wide: true });
  document.querySelector("#referenceId").textContent = String(data).slice(0, 8).toUpperCase();

  form.hidden = true;
  confirmation.hidden = false;
  confirmation.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#printButton").addEventListener("click", () => window.print());

loadEmployees();

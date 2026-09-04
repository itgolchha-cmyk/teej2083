import { isConfigured, supabase } from "./supabase.js";

const form = document.querySelector("#giftForm");
const employeeInput = document.querySelector("#employee");
const employeeOptions = document.querySelector("#employeeOptions");
const employeeHint = document.querySelector("#employeeHint");
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
let lastMatchedEmployeeId = null;

function cleanValue(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizedName(value) {
  return cleanValue(value).toLocaleLowerCase();
}

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

function matchedEmployee() {
  const name = normalizedName(employeeInput.value);
  return name ? employees.find(employee => normalizedName(employee.employee_name) === name) : undefined;
}

function fillEmployeeDetails(employee) {
  Object.entries(detailFields).forEach(([key, input]) => {
    input.value = employee?.[key] ?? "";
    input.readOnly = Boolean(employee) || !cleanValue(employeeInput.value);
  });
}

function updateEmployeeDetails() {
  const employee = matchedEmployee();
  if (employee) {
    fillEmployeeDetails(employee);
    lastMatchedEmployeeId = employee.id;
    employeeHint.textContent = "Employee record found. Office details have been filled automatically.";
  } else {
    if (lastMatchedEmployeeId !== null || !cleanValue(employeeInput.value)) fillEmployeeDetails();
    Object.values(detailFields).forEach(input => {
      input.readOnly = !cleanValue(employeeInput.value);
    });
    lastMatchedEmployeeId = null;
    employeeHint.textContent = cleanValue(employeeInput.value)
      ? "New employee name. Please complete all required office details."
      : "Type your full name. You can enter a new name if it is not listed.";
  }
  clearError();
}

function fillDatalist(id, values) {
  const list = document.querySelector(id);
  list.replaceChildren(...[...new Set(values)].sort().map(value => new Option(value)));
}

async function loadEmployees() {
  if (!isConfigured) {
    configError.hidden = false;
    employeeInput.placeholder = "Supabase connection required";
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
    employeeInput.placeholder = "Employee records unavailable";
    return;
  }

  employees = data ?? [];
  employeeOptions.replaceChildren(...employees.map(employee => new Option(employee.employee_name)));
  fillDatalist("#unitOptions", employees.map(employee => employee.unit));
  fillDatalist("#branchOptions", employees.map(employee => employee.branch));
  fillDatalist("#departmentOptions", employees.map(employee => employee.department));
  employeeInput.placeholder = "Type your full name";
  employeeInput.disabled = false;
  submitButton.disabled = false;
}

employeeInput.addEventListener("input", updateEmployeeDetails);
employeeInput.addEventListener("change", updateEmployeeDetails);

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

  const employee = matchedEmployee();
  const employeeName = cleanValue(employeeInput.value);
  const employeeDetails = Object.fromEntries(
    Object.entries(detailFields).map(([key, input]) => [key, cleanValue(input.value)])
  );
  const gift = document.querySelector('[name="gift"]:checked');
  const spa = document.querySelector('[name="spaTreatment"]:checked');

  if (!employeeName || Object.values(employeeDetails).some(value => !value) || !gift || (gift.value === "Tranquility Spa" && !spa) || !form.checkValidity()) {
    showError(gift?.value === "Tranquility Spa" && !spa
      ? "Please select one Tranquility Spa treatment."
      : "Please complete all required fields before submitting.");
    form.reportValidity();
    return;
  }

  setLoading(submitButton, true);
  const { data, error } = await supabase.rpc("submit_gift_selection", {
    p_employee_name: employeeName,
    p_designation: employeeDetails.designation,
    p_unit: employeeDetails.unit,
    p_branch: employeeDetails.branch,
    p_department: employeeDetails.department,
    p_gift_name: gift.value,
    p_spa_treatment: gift.value === "Tranquility Spa" ? spa.value : null
  });
  setLoading(submitButton, false);

  if (error) {
    const errorMessage = error.message.toLowerCase();
    const duplicate = errorMessage.includes("already been submitted") || errorMessage.includes("duplicate employee") || error.code === "23505";
    showError(duplicate
      ? "Duplicate entry: a gift selection has already been submitted for this employee name. Please contact the administrator if it needs to be changed."
      : "We could not save your selection. Please check your connection and try again.");
    return;
  }

  const summary = document.querySelector("#summary");
  summary.replaceChildren();
  addSummaryItem(summary, "Employee Name", employee?.employee_name ?? employeeName);
  addSummaryItem(summary, "Designation", employeeDetails.designation);
  addSummaryItem(summary, "Unit", employeeDetails.unit);
  addSummaryItem(summary, "Branch", employeeDetails.branch);
  addSummaryItem(summary, "Department", employeeDetails.department);
  addSummaryItem(summary, "Selected Gift", gift.value, { wide: true, gift: true });
  if (spa) addSummaryItem(summary, "Spa Treatment", spa.value, { wide: true });
  document.querySelector("#referenceId").textContent = String(data).slice(0, 8).toUpperCase();

  form.hidden = true;
  confirmation.hidden = false;
  confirmation.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#printButton").addEventListener("click", () => window.print());

loadEmployees();

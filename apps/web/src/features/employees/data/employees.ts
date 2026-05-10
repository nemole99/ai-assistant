import { faker } from "@faker-js/faker";

faker.seed(12345);

const departments = [
  { id: "dept-1", name: "Administration" },
  { id: "dept-2", name: "GPP" },
  { id: "dept-3", name: "Weclever" },
  { id: "dept-4", name: "Dent" },
  { id: "dept-5", name: "HR" },
  { id: "dept-6", name: "QA" },
];

export const employees = Array.from({ length: 50 }, (_, i) => {
  const fullName = faker.person.fullName();
  const department = faker.helpers.arrayElement(departments);
  return {
    id: faker.string.uuid(),
    employeeCode: `EMP-${String(i + 1).padStart(4, "0")}`,
    fullName,
    email: faker.internet
      .email({ firstName: fullName.split(" ")[0] })
      .toLocaleLowerCase(),
    phone: faker.phone.number({ style: "international" }),
    position: faker.person.jobTitle(),
    departmentId: department.id,
    departmentName: department.name,
    userId:
      faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.3 }) ??
      null,
    joinDate: faker.date.past({ years: 3 }).toISOString().split("T")[0],
    status: faker.helpers.arrayElement(["ACTIVE", "INACTIVE"] as const),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
});

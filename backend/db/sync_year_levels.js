require('dotenv').config();

const { pool } = require('../src/config/db');
const studentProgressionService = require('../src/modules/students/student_progression.service');

async function main() {
  try {
    const summary = await studentProgressionService.syncAllStudentYearLevels();

    console.log(`Year level sync complete. Total students checked: ${summary.total}`);
    console.log(`Updated: ${summary.changed}`);
    console.log(`Unchanged: ${summary.unchanged}`);

    const updatedStudents = summary.results.filter((item) => item.changed);
    if (updatedStudents.length) {
      console.log('Updated students:');
      updatedStudents.forEach((item) => {
        console.log(
          `- ${item.studentId}: Year ${item.previousYearLevel} -> Year ${item.yearLevel} (${item.course})`
        );
      });
    }
  } catch (error) {
    console.error('Failed to sync year levels:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();

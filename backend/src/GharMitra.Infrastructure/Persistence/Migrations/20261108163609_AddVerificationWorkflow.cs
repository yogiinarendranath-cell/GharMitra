using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GharMitra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVerificationWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IdProofType",
                table: "Professionals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdProofUrl",
                table: "Professionals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "Professionals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SelfieUrl",
                table: "Professionals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerificationStatus",
                table: "Professionals",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IdProofType",
                table: "Professionals");

            migrationBuilder.DropColumn(
                name: "IdProofUrl",
                table: "Professionals");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "Professionals");

            migrationBuilder.DropColumn(
                name: "SelfieUrl",
                table: "Professionals");

            migrationBuilder.DropColumn(
                name: "VerificationStatus",
                table: "Professionals");
        }
    }
}

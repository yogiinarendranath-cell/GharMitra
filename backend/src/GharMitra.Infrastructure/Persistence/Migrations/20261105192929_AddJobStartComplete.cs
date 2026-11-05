using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GharMitra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddJobStartComplete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAtUtc",
                table: "BookingAssignments",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartedAtUtc",
                table: "BookingAssignments");
        }
    }
}

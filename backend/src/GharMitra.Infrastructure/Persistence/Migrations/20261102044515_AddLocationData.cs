using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GharMitra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastLocationUpdateUtc",
                table: "Professionals",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Professionals",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Professionals",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Bookings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Bookings",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastLocationUpdateUtc",
                table: "Professionals");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Professionals");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Professionals");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Bookings");
        }
    }
}

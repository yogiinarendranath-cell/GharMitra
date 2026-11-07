using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GharMitra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "RefundAmount",
                table: "Bookings",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundReason",
                table: "Bookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefundedAtUtc",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RefundAmount",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundReason",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundedAtUtc",
                table: "Bookings");
        }
    }
}

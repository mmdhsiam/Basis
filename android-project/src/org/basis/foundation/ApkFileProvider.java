package org.basis.foundation;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.List;

/**
 * Zero-dependency FileProvider implementation using standard Android SDK ContentProvider
 * to serve downloaded update APKs securely to the Android System Package Installer.
 */
public class ApkFileProvider extends ContentProvider {

    private static final String[] COLUMNS = {
        OpenableColumns.DISPLAY_NAME,
        OpenableColumns.SIZE
    };

    @Override
    public boolean onCreate() {
        return true;
    }

    private File resolveApkFile(Uri uri) throws FileNotFoundException {
        Context context = getContext();
        if (context == null || uri == null) {
            throw new FileNotFoundException("Invalid URI or context");
        }
        List<String> segments = uri.getPathSegments();
        if (segments == null || segments.size() < 2 || !"updates".equals(segments.get(0))) {
            throw new FileNotFoundException("Unsupported URI path: " + uri);
        }
        String fileName = segments.get(segments.size() - 1);
        if (fileName == null || fileName.contains("..") || fileName.contains("/")) {
            throw new FileNotFoundException("Invalid file name");
        }
        File updatesDir = new File(context.getCacheDir(), "updates");
        File target = new File(updatesDir, fileName);
        try {
            String dirCanonical = updatesDir.getCanonicalPath();
            String fileCanonical = target.getCanonicalPath();
            if (!fileCanonical.startsWith(dirCanonical + File.separator)) {
                throw new FileNotFoundException("Path traversal rejected");
            }
        } catch (IOException e) {
            throw new FileNotFoundException("Failed to canonicalize file path");
        }
        if (!target.exists() || !target.isFile()) {
            throw new FileNotFoundException("APK file not found: " + target.getAbsolutePath());
        }
        return target;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        try {
            File file = resolveApkFile(uri);
            String[] cols = (projection != null && projection.length > 0) ? projection : COLUMNS;
            MatrixCursor cursor = new MatrixCursor(cols, 1);
            Object[] row = new Object[cols.length];
            for (int i = 0; i < cols.length; i++) {
                if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) {
                    row[i] = file.getName();
                } else if (OpenableColumns.SIZE.equals(cols[i])) {
                    row[i] = file.length();
                }
            }
            cursor.addRow(row);
            return cursor;
        } catch (FileNotFoundException e) {
            return new MatrixCursor(COLUMNS, 0);
        }
    }

    @Override
    public String getType(Uri uri) {
        String last = uri != null ? uri.getLastPathSegment() : null;
        if (last != null && last.toLowerCase().endsWith(".apk")) {
            return "application/vnd.android.package-archive";
        }
        return "application/octet-stream";
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File file = resolveApkFile(uri);
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("Insert not supported");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("Update not supported");
    }
}
